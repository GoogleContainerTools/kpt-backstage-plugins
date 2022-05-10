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
import React from 'react';
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
import { sortByPackageNameAndRevisionComparison } from '../../../utils/packageRevision';
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
  lifecycle: string;
  created: string;
};

const getTableColumns = (
  syncs?: RootSync[],
): TableColumn<PackageRevisionRow>[] => {
  const columns: TableColumn<PackageRevisionRow>[] = [
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
  repository: Repository,
  syncs: RootSync[],
  onePackage: PackageRevision,
): SyncStatus | null | undefined => {
  if (
    syncs &&
    onePackage.spec.lifecycle === PackageRevisionLifecycle.PUBLISHED
  ) {
    const rootSync = findRootSyncForPackage(syncs, onePackage, repository);

    if (rootSync?.status) {
      return getSyncStatus(rootSync.status);
    }

    return null;
  }

  return undefined;
};

const mapToPackageRevisionRow = (
  onePackage: PackageRevision,
  repository: Repository,
  syncs: RootSync[],
): PackageRevisionRow => ({
  id: onePackage.metadata.name,
  name: onePackage.metadata.name,
  packageName: onePackage.spec.packageName,
  revision: onePackage.spec.revision,
  lifecycle: onePackage.spec.lifecycle,
  syncStatus: getRootSyncStatus(repository, syncs, onePackage),
  created: formatCreationTimestamp(onePackage.metadata.creationTimestamp),
});

export const PackageRevisionsTable = ({
  title,
  repository,
  packages,
  syncs,
}: PackageRevisionsTableProps) => {
  const navigate = useNavigate();

  const packageRef = useRouteRef(packageRouteRef);

  packages.sort(sortByPackageNameAndRevisionComparison);

  const columns = getTableColumns(syncs);
  const data = packages.map(onePackage =>
    mapToPackageRevisionRow(onePackage, repository, syncs || []),
  );

  const repositoryName = repository.metadata.name;

  return (
    <Table
      title={title}
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
      onRowClick={(_, thisPackage) => {
        if (thisPackage) {
          const packageName = thisPackage.name;

          navigate(packageRef({ repositoryName, packageName }));
        }
      }}
    />
  );
};
