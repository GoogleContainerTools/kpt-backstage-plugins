/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Table, TableColumn } from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { IconButton, makeStyles } from '@material-ui/core';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { groupBy } from 'lodash';
import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageRouteRef } from '../../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../../types/PackageRevision';
import { Repository } from '../../../types/Repository';
import { RootSync } from '../../../types/RootSync';
import {
  findRootSyncForPackage,
  getSyncStatus,
  SyncStatus,
} from '../../../utils/configSync';
import { formatCreationTimestamp } from '../../../utils/formatDate';
import {
  findLatestPublishedRevision,
  isNotAPublishedRevision,
  sortByPackageNameAndRevisionComparison,
} from '../../../utils/packageRevision';
import { PackageIcon } from '../../Controls';
import { SyncStatusVisual } from './SyncStatusVisual';

type PackageRevisionsTableProps = {
  title: string;
  repository: Repository;
  packages: PackageRevision[];
  syncs?: RootSync[];
};

type PackageRevisionRow = {
  id: string;
  name: string;
  revision: string;
  packageName: string;
  syncStatus?: SyncStatus | null;
  lifecycle: PackageRevisionLifecycle;
  created: string;
  navigate: () => void;
  unpublished?: PackageRevisionRow;
};

type NavigateToPackageRevision = (name: string) => void;
type FindSync = (thisPackage: PackageRevision) => RootSync | undefined;

const useStyles = makeStyles({
  iconButton: {
    position: 'absolute',
    transform: 'translateY(-50%)',
  },
});

const renderStatusColumn = (
  thisPackageRevisionRow: PackageRevisionRow,
  classes: ClassNameMap,
): JSX.Element => {
  const unpublishedRevision = thisPackageRevisionRow.unpublished;

  if (unpublishedRevision) {
    return (
      <IconButton
        size="small"
        className={classes.iconButton}
        onClick={e => {
          e.stopPropagation();
          unpublishedRevision.navigate();
        }}
      >
        <PackageIcon lifecycle={unpublishedRevision.lifecycle} />
      </IconButton>
    );
  }

  return <Fragment />;
};

const getTableColumns = (
  classes: ClassNameMap,
  syncs?: RootSync[],
): TableColumn<PackageRevisionRow>[] => {
  const renderStatus = (row: PackageRevisionRow): JSX.Element =>
    renderStatusColumn(row, classes);

  const columns: TableColumn<PackageRevisionRow>[] = [
    {
      title: 'Status',
      width: '80px',
      render: renderStatus,
    },
    { title: 'Name', field: 'packageName' },
    { title: 'Revision', field: 'revision' },
    { title: 'Lifecycle', field: 'lifecycle' },
    { title: 'Created', field: 'created' },
  ];

  if (syncs) {
    columns.splice(columns.length - 1, 0, {
      title: 'Sync Status',
      render: (thisPackage: PackageRevisionRow): JSX.Element => (
        <SyncStatusVisual syncStatus={thisPackage.syncStatus} />
      ),
    });
  }

  return columns;
};

const getRootSyncStatus = (
  onePackage: PackageRevision,
  findSync: FindSync,
): SyncStatus | null | undefined => {
  if (onePackage.spec.lifecycle === PackageRevisionLifecycle.PUBLISHED) {
    const rootSync = findSync(onePackage);

    if (rootSync?.status) {
      return getSyncStatus(rootSync.status);
    }

    return null;
  }

  return undefined;
};

const mapToPackageRevisionRow = (
  onePackage: PackageRevision,
  navigateToPackageRevision: NavigateToPackageRevision,
  findSync: FindSync,
  unpublishedRevision: PackageRevision | undefined,
): PackageRevisionRow => ({
  id: onePackage.metadata.name,
  name: onePackage.metadata.name,
  packageName: onePackage.spec.packageName,
  revision: onePackage.spec.revision,
  lifecycle: onePackage.spec.lifecycle,
  syncStatus: getRootSyncStatus(onePackage, findSync),
  created: formatCreationTimestamp(onePackage.metadata.creationTimestamp),
  navigate: () => navigateToPackageRevision(onePackage.metadata.name),
  unpublished: unpublishedRevision
    ? mapToPackageRevisionRow(
        unpublishedRevision,
        navigateToPackageRevision,
        findSync,
        undefined,
      )
    : undefined,
});

const mapPackageRevisionsToRows = (
  packageRevisions: PackageRevision[],
  navigateToPackageRevision: NavigateToPackageRevision,
  findSync: FindSync,
): PackageRevisionRow[] => {
  packageRevisions.sort(sortByPackageNameAndRevisionComparison);

  const groupByPackage = groupBy(
    packageRevisions,
    revision => revision.spec.packageName,
  );

  const rows: PackageRevisionRow[] = Object.keys(groupByPackage).map(
    packageName => {
      const allRevisions = groupByPackage[packageName];

      const latestRevision = allRevisions[0];
      const latestPublishedRevision = findLatestPublishedRevision(allRevisions);

      const useForRowRevision = latestPublishedRevision || latestRevision;
      const isLatestRevisionNotPublished =
        isNotAPublishedRevision(latestRevision);

      const unpublishedRevision = isLatestRevisionNotPublished
        ? latestRevision
        : undefined;

      const row = mapToPackageRevisionRow(
        useForRowRevision,
        navigateToPackageRevision,
        findSync,
        unpublishedRevision,
      );

      return row;
    },
  );

  return rows;
};

export const PackageRevisionsTable = ({
  title,
  repository,
  packages,
  syncs,
}: PackageRevisionsTableProps) => {
  const classes = useStyles();
  const navigate = useNavigate();

  const packageRef = useRouteRef(packageRouteRef);

  const navigateToPackageRevision: NavigateToPackageRevision = (
    packageName: string,
  ): void => {
    const repositoryName = repository.metadata.name;

    navigate(packageRef({ repositoryName, packageName }));
  };

  const findSync: FindSync = (
    thisPackage: PackageRevision,
  ): RootSync | undefined => {
    return findRootSyncForPackage(syncs ?? [], thisPackage, repository);
  };

  const columns = getTableColumns(classes, syncs);
  const data = mapPackageRevisionsToRows(
    packages,
    navigateToPackageRevision,
    findSync,
  );

  return (
    <Table
      title={title}
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
      onRowClick={(_, thisPackage) => thisPackage?.navigate()}
    />
  );
};
