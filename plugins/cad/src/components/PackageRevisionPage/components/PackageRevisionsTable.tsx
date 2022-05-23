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
import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageRouteRef } from '../../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../../types/PackageRevision';
import { Repository } from '../../../types/Repository';
import { formatCreationTimestamp } from '../../../utils/formatDate';
import { sortByPackageNameAndRevisionComparison } from '../../../utils/packageRevision';
import { PackageIcon } from '../../Controls';

type PackageRevisionsTableProps = {
  repository: Repository;
  revisions: PackageRevision[];
};

type PackageRevisionRow = {
  id: string;
  name: string;
  revision: string;
  packageName: string;
  lifecycle: PackageRevisionLifecycle;
  created: string;
};

const useStyles = makeStyles({
  iconButton: {
    position: 'absolute',
    transform: 'translateY(-50%)',
  },
});

const renderStatusColumn = (
  revision: PackageRevisionRow,
  classes: ClassNameMap,
): JSX.Element => {
  const isUnpublishedRevision =
    revision.lifecycle !== PackageRevisionLifecycle.PUBLISHED;

  if (isUnpublishedRevision) {
    return (
      <IconButton size="small" className={classes.iconButton}>
        <PackageIcon lifecycle={revision.lifecycle} />
      </IconButton>
    );
  }

  return <Fragment />;
};

const getTableColumns = (
  classes: ClassNameMap,
): TableColumn<PackageRevisionRow>[] => {
  const renderStatus = (row: PackageRevisionRow): JSX.Element =>
    renderStatusColumn(row, classes);

  const columns: TableColumn<PackageRevisionRow>[] = [
    {
      title: 'Status',
      width: '80px',
      render: renderStatus,
    },
    { title: 'Revision', field: 'revision' },
    { title: 'Lifecycle', field: 'lifecycle' },
    { title: 'Created', field: 'created' },
  ];

  return columns;
};

const mapToPackageRevisionRow = (
  onePackage: PackageRevision,
): PackageRevisionRow => ({
  id: onePackage.metadata.name,
  name: onePackage.metadata.name,
  packageName: onePackage.spec.packageName,
  revision: onePackage.spec.revision,
  lifecycle: onePackage.spec.lifecycle,
  created: formatCreationTimestamp(onePackage.metadata.creationTimestamp, true),
});

const mapPackageRevisionsToRows = (
  packageRevisions: PackageRevision[],
): PackageRevisionRow[] => {
  packageRevisions.sort(sortByPackageNameAndRevisionComparison);

  const rows: PackageRevisionRow[] = packageRevisions.map(
    mapToPackageRevisionRow,
  );

  return rows;
};

export const PackageRevisionsTable = ({
  repository,
  revisions,
}: PackageRevisionsTableProps) => {
  const classes = useStyles();
  const navigate = useNavigate();

  const packageRef = useRouteRef(packageRouteRef);

  const navigateToPackageRevision = (packageName?: string): void => {
    if (packageName) {
      const repositoryName = repository.metadata.name;

      navigate(packageRef({ repositoryName, packageName }));
    }
  };

  const columns = getTableColumns(classes);
  const data = mapPackageRevisionsToRows(revisions);

  return (
    <Table
      title="Revisions"
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
      onRowClick={(_, thisPackage) =>
        navigateToPackageRevision(thisPackage?.name)
      }
    />
  );
};
