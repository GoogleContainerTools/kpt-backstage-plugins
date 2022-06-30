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
import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageRouteRef } from '../../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../../types/PackageRevision';
import { Repository } from '../../../types/Repository';
import { getSyncStatus, SyncStatus } from '../../../utils/configSync';
import { formatCreationTimestamp } from '../../../utils/formatDate';
import { PackageSummary } from '../../../utils/packageSummary';
import { isDeploymentRepository } from '../../../utils/repository';
import { IconButton, PackageIcon } from '../../Controls';
import { PackageLink } from '../../Links';
import { SyncStatusVisual } from './SyncStatusVisual';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';

type PackagesTableProps = {
  title: string;
  repository: Repository;
  packages: PackageSummary[];
};

type UnpublishedPackageRevision = {
  name: string;
  revision: string;
  packageName: string;
  lifecycle: PackageRevisionLifecycle;
  created: string;
  navigate: () => void;
};

type PackageRow = {
  id: string;
  name: string;
  revision: string;
  packageName: string;
  syncStatus?: SyncStatus | null;
  lifecycle: PackageRevisionLifecycle;
  created: string;
  upstreamPackageDisplayName?: string;
  upstreamPackageRevision?: PackageRevision;
  navigate: () => void;
  unpublished?: UnpublishedPackageRevision;
  isUpgradeAvailable?: boolean;
};

type NavigateToPackageRevision = (revision: PackageRevision) => void;

const renderStatusColumn = (row: PackageRow): JSX.Element => {
  const unpublishedRevision = row.unpublished;

  const elements: JSX.Element[] = [];

  if (row.isUpgradeAvailable) {
    elements.push(
      <IconButton title="Upgrade available">
        <ArrowUpwardIcon />
      </IconButton>,
    );
  }

  if (unpublishedRevision) {
    elements.push(
      <IconButton
        title={`${unpublishedRevision.lifecycle} revision`}
        stopPropagation
        onClick={() => unpublishedRevision.navigate()}
      >
        <PackageIcon lifecycle={unpublishedRevision.lifecycle} />
      </IconButton>,
    );
  }

  return (
    <div style={{ position: 'absolute', transform: 'translateY(-50%)' }}>
      {...elements}
    </div>
  );
};

const renderBlueprintColumn = (row: PackageRow): JSX.Element => {
  if (row.upstreamPackageRevision) {
    return (
      <PackageLink
        packageRevision={row.upstreamPackageRevision}
        stopPropagation
      />
    );
  }

  return <Fragment>{row.upstreamPackageDisplayName || ''}</Fragment>;
};

const renderSyncColumn = (row: PackageRow): JSX.Element => (
  <SyncStatusVisual syncStatus={row.syncStatus} />
);

const getTableColumns = (
  includeSyncsColumn: boolean,
): TableColumn<PackageRow>[] => {
  const columns: TableColumn<PackageRow>[] = [
    {
      title: 'Status',
      width: '80px',
      render: renderStatusColumn,
    },
    { title: 'Name', field: 'packageName' },
    { title: 'Revision', field: 'revision' },
    { title: 'Lifecycle', field: 'lifecycle' },
    { title: 'Blueprint', render: renderBlueprintColumn },
    { title: 'Created', field: 'created' },
  ];

  if (includeSyncsColumn) {
    columns.splice(columns.length - 1, 0, {
      title: 'Sync Status',
      render: renderSyncColumn,
    });
  }

  return columns;
};

const getRootSyncStatus = (
  packageSummary: PackageSummary,
): SyncStatus | null | undefined => {
  if (packageSummary.latestPublishedRevision) {
    const rootSync = packageSummary.sync;

    if (rootSync?.status) {
      return getSyncStatus(rootSync.status);
    }

    return null;
  }

  return undefined;
};

const mapToUnpublishedRevision = (
  packageSummary: PackageSummary,
  navigateToPackageRevision: NavigateToPackageRevision,
): UnpublishedPackageRevision | undefined => {
  const unpublishedRevision = packageSummary.unpublishedRevision;

  if (unpublishedRevision) {
    return {
      name: unpublishedRevision.metadata.name,
      packageName: unpublishedRevision.spec.packageName,
      revision: unpublishedRevision.spec.revision,
      lifecycle: unpublishedRevision.spec.lifecycle,
      created: formatCreationTimestamp(
        unpublishedRevision.metadata.creationTimestamp,
      ),
      navigate: () => navigateToPackageRevision(unpublishedRevision),
    };
  }

  return undefined;
};

const mapToPackageSummaryRow = (
  packageSummary: PackageSummary,
  navigateToPackageRevision: NavigateToPackageRevision,
): PackageRow => {
  const onePackage =
    packageSummary.latestPublishedRevision ?? packageSummary.latestRevision;

  return {
    id: onePackage.metadata.name,
    name: onePackage.metadata.name,
    packageName: onePackage.spec.packageName,
    revision: onePackage.spec.revision,
    lifecycle: onePackage.spec.lifecycle,
    syncStatus: getRootSyncStatus(packageSummary),
    created: formatCreationTimestamp(onePackage.metadata.creationTimestamp),
    navigate: () => navigateToPackageRevision(onePackage),
    upstreamPackageDisplayName: packageSummary.upstreamPackageName
      ? `${packageSummary.upstreamPackageName} ${packageSummary.upstreamPackageRevision}`
      : undefined,
    isUpgradeAvailable: packageSummary.isUpgradeAvailable,
    upstreamPackageRevision: packageSummary.upstreamRevision,
    unpublished: mapToUnpublishedRevision(
      packageSummary,
      navigateToPackageRevision,
    ),
  };
};

const mapPackageSummariesToRows = (
  packageSummaries: PackageSummary[],
  navigateToPackageRevision: NavigateToPackageRevision,
): PackageRow[] => {
  return packageSummaries.map(summary =>
    mapToPackageSummaryRow(summary, navigateToPackageRevision),
  );
};

export const PackagesTable = ({
  title,
  repository,
  packages,
}: PackagesTableProps) => {
  const navigate = useNavigate();

  const packageRef = useRouteRef(packageRouteRef);

  const navigateToPackageRevision: NavigateToPackageRevision = (
    revision: PackageRevision,
  ): void => {
    const packageName = revision.metadata.name;
    const repositoryName = revision.spec.repository;

    navigate(packageRef({ repositoryName, packageName }));
  };

  const includeSyncsColumn = isDeploymentRepository(repository);
  const columns = getTableColumns(includeSyncsColumn);

  const data = mapPackageSummariesToRows(packages, navigateToPackageRevision);

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
