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

import { LinkButton } from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { Button } from '@material-ui/core';
import React, { Fragment } from 'react';
import {
  clonePackageRouteRef,
  editPackageRouteRef,
  packageRouteRef,
} from '../../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../../types/PackageRevision';
import { RepositorySummary } from '../../../types/RepositorySummary';
import { RootSync } from '../../../types/RootSync';
import {
  canCloneRevision,
  findLatestPublishedRevision,
  isLatestPublishedRevision,
} from '../../../utils/packageRevision';
import {
  getPackageDescriptor,
  isDeploymentRepository,
  isReadOnlyRepository,
  RepositoryContentDetails,
} from '../../../utils/repository';
import { PackageRevisionPageMode } from '../PackageRevisionPage';

export enum RevisionOption {
  CREATE_NEW_REVISION = 'new-revision',
  SAVE_REVISION = 'save-revision',
  PROPOSE_REVISION = 'propose-revision',
  REJECT_PROPOSED_REVISION = 'reject-proposed-revision',
  APPROVE_PROPOSED_REVISION = 'approve-proposed-revision',
  CREATE_UPGRADE_REVISION = 'create-upgrade-revision',
  RESTORE_REVISION = 'restore-revision',
  CREATE_SYNC = 'create-sync',
}

type PackageRevisionOptionsProps = {
  repositorySummary: RepositorySummary;
  packageRevision: PackageRevision;
  packageRevisions: PackageRevision[];
  isUpgradeAvailable: boolean;
  rootSync?: RootSync | null;
  mode: PackageRevisionPageMode;
  onClick: (option: RevisionOption) => Promise<void>;
  disabled: boolean;
};

const DraftPackageRevisionOptions = ({
  repositorySummary,
  packageRevision,
  mode,
  onClick,
  disabled,
}: PackageRevisionOptionsProps) => {
  const packageRef = useRouteRef(packageRouteRef);
  const editPackageRef = useRouteRef(editPackageRouteRef);

  const packageName = packageRevision.metadata.name;
  const repositoryName = packageRevision.spec.repository;

  const isEditMode = mode === PackageRevisionPageMode.EDIT;
  const isViewOnly = isReadOnlyRepository(repositorySummary.repository);

  if (isViewOnly) {
    return <Fragment />;
  }

  if (isEditMode) {
    return (
      <Fragment>
        <LinkButton
          to={packageRef({ repositoryName, packageName })}
          variant="outlined"
          color="primary"
          disabled={disabled}
        >
          Cancel
        </LinkButton>

        <Button
          onClick={() => onClick(RevisionOption.SAVE_REVISION)}
          variant="contained"
          color="primary"
          disabled={disabled}
        >
          Save
        </Button>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <LinkButton
        to={editPackageRef({ repositoryName, packageName })}
        color="primary"
        variant="outlined"
        disabled={disabled}
      >
        Edit
      </LinkButton>

      <Button
        color="primary"
        variant="contained"
        onClick={() => onClick(RevisionOption.PROPOSE_REVISION)}
        disabled={disabled}
      >
        Propose
      </Button>
    </Fragment>
  );
};

const ProposedPackageRevisionOptions = ({
  repositorySummary,
  onClick,
  disabled,
}: PackageRevisionOptionsProps) => {
  const isViewOnly = isReadOnlyRepository(repositorySummary.repository);

  if (isViewOnly) {
    return <Fragment />;
  }

  return (
    <Fragment>
      <Button
        color="primary"
        variant="outlined"
        onClick={() => onClick(RevisionOption.REJECT_PROPOSED_REVISION)}
        disabled={disabled}
      >
        Reject
      </Button>

      <Button
        color="primary"
        variant="contained"
        onClick={() => onClick(RevisionOption.APPROVE_PROPOSED_REVISION)}
        disabled={disabled}
      >
        Approve
      </Button>
    </Fragment>
  );
};

const PublishedPackageRevisionOptions = ({
  repositorySummary,
  packageRevision,
  packageRevisions,
  isUpgradeAvailable,
  rootSync,
  onClick,
  disabled,
}: PackageRevisionOptionsProps) => {
  const packageRef = useRouteRef(packageRouteRef);
  const clonePackageRef = useRouteRef(clonePackageRouteRef);

  const packageName = packageRevision.metadata.name;
  const repositoryName = packageRevision.spec.repository;

  const latestRevision = packageRevisions[0];
  const latestPublishedRevision = findLatestPublishedRevision(packageRevisions);

  const isReadOnly = isReadOnlyRepository(repositorySummary.repository);
  const isLatestPublishedPackageRevision =
    packageRevision && isLatestPublishedRevision(packageRevision);

  if (!latestPublishedRevision) {
    throw new Error('Latest published revision cannot be found');
  }

  if (!isLatestPublishedPackageRevision) {
    return (
      <Fragment>
        {!isReadOnly && (
          <Button
            onClick={() => onClick(RevisionOption.RESTORE_REVISION)}
            color="primary"
            variant="outlined"
            disabled={disabled}
          >
            Restore Revision
          </Button>
        )}

        <LinkButton
          to={packageRef({
            repositoryName: latestPublishedRevision.spec.repository,
            packageName: latestPublishedRevision.metadata.name,
          })}
          color="primary"
          variant="outlined"
          disabled={disabled}
        >
          View Latest Published Revision
        </LinkButton>
      </Fragment>
    );
  }

  const packageContentType = getPackageDescriptor(repositorySummary.repository);

  const isNewerUnpublishedRevision = latestRevision !== latestPublishedRevision;

  const showUpgrade =
    !isReadOnly && isUpgradeAvailable && !isNewerUnpublishedRevision;
  const showCreateNewRevision = !isReadOnly && !isNewerUnpublishedRevision;
  const showClone =
    RepositoryContentDetails[packageContentType].cloneTo.length > 0 &&
    canCloneRevision(packageRevision);

  const showCreateSync =
    !isReadOnly &&
    isDeploymentRepository(repositorySummary.repository) &&
    rootSync === null;

  return (
    <Fragment>
      {showUpgrade && (
        <Button
          variant="outlined"
          color="primary"
          onClick={() => onClick(RevisionOption.CREATE_UPGRADE_REVISION)}
          disabled={disabled}
        >
          Upgrade to Latest Blueprint
        </Button>
      )}

      {showCreateNewRevision && (
        <Button
          variant="outlined"
          color="primary"
          onClick={() => onClick(RevisionOption.CREATE_NEW_REVISION)}
          disabled={disabled}
        >
          Create New Revision
        </Button>
      )}

      {isNewerUnpublishedRevision && (
        <LinkButton
          to={packageRef({
            repositoryName,
            packageName: latestRevision.metadata.name,
          })}
          color="primary"
          variant="outlined"
        >
          View {latestRevision.spec.lifecycle} Revision
        </LinkButton>
      )}

      {showCreateSync && (
        <Button
          color="primary"
          variant="contained"
          onClick={() => onClick(RevisionOption.CREATE_SYNC)}
          disabled={disabled}
        >
          Create Sync
        </Button>
      )}

      {showClone && (
        <LinkButton
          to={clonePackageRef({ repositoryName, packageName })}
          color="primary"
          variant="contained"
          disabled={disabled}
        >
          Clone
        </LinkButton>
      )}
    </Fragment>
  );
};

export const PackageRevisionOptions = ({
  repositorySummary,
  packageRevision,
  packageRevisions,
  isUpgradeAvailable,
  rootSync,
  onClick,
  disabled,
  mode,
}: PackageRevisionOptionsProps) => {
  const isDraft =
    packageRevision.spec.lifecycle === PackageRevisionLifecycle.DRAFT;
  const isProposed =
    packageRevision.spec.lifecycle === PackageRevisionLifecycle.PROPOSED;

  if (isDraft) {
    return (
      <DraftPackageRevisionOptions
        repositorySummary={repositorySummary}
        packageRevision={packageRevision}
        packageRevisions={packageRevisions}
        isUpgradeAvailable={isUpgradeAvailable}
        rootSync={rootSync}
        onClick={onClick}
        disabled={disabled}
        mode={mode}
      />
    );
  }

  if (isProposed) {
    return (
      <ProposedPackageRevisionOptions
        repositorySummary={repositorySummary}
        packageRevision={packageRevision}
        packageRevisions={packageRevisions}
        isUpgradeAvailable={isUpgradeAvailable}
        rootSync={rootSync}
        onClick={onClick}
        disabled={disabled}
        mode={mode}
      />
    );
  }

  return (
    <PublishedPackageRevisionOptions
      repositorySummary={repositorySummary}
      packageRevision={packageRevision}
      packageRevisions={packageRevisions}
      isUpgradeAvailable={isUpgradeAvailable}
      rootSync={rootSync}
      onClick={onClick}
      disabled={disabled}
      mode={mode}
    />
  );
};
