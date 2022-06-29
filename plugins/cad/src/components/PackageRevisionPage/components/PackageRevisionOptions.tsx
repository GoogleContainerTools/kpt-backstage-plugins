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

import { Button } from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { Button as MaterialButton } from '@material-ui/core';
import React, { Fragment } from 'react';
import {
  deployPackageRouteRef,
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
  canCloneOrDeploy,
  findLatestPublishedRevision,
  isLatestPublishedRevision,
} from '../../../utils/packageRevision';
import { isDeploymentRepository } from '../../../utils/repository';
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

  if (isEditMode) {
    return (
      <Fragment>
        <Button
          to={packageRef({ repositoryName, packageName })}
          variant="outlined"
          color="primary"
          disabled={disabled}
        >
          Cancel
        </Button>

        <MaterialButton
          onClick={() => onClick(RevisionOption.SAVE_REVISION)}
          variant="contained"
          color="primary"
          disabled={disabled}
        >
          Save
        </MaterialButton>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Button
        to={editPackageRef({ repositoryName, packageName })}
        color="primary"
        variant="outlined"
        disabled={disabled}
      >
        Edit
      </Button>

      <MaterialButton
        color="primary"
        variant="contained"
        onClick={() => onClick(RevisionOption.PROPOSE_REVISION)}
        disabled={disabled}
      >
        Propose
      </MaterialButton>
    </Fragment>
  );
};

const ProposedPackageRevisionOptions = ({
  onClick,
  disabled,
}: PackageRevisionOptionsProps) => {
  return (
    <Fragment>
      <MaterialButton
        color="primary"
        variant="outlined"
        onClick={() => onClick(RevisionOption.REJECT_PROPOSED_REVISION)}
        disabled={disabled}
      >
        Reject
      </MaterialButton>

      <MaterialButton
        color="primary"
        variant="contained"
        onClick={() => onClick(RevisionOption.APPROVE_PROPOSED_REVISION)}
        disabled={disabled}
      >
        Approve
      </MaterialButton>
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
  const deployPackageRef = useRouteRef(deployPackageRouteRef);

  const packageName = packageRevision.metadata.name;
  const repositoryName = packageRevision.spec.repository;

  const latestRevision = packageRevisions[0];
  const latestPublishedRevision = findLatestPublishedRevision(packageRevisions);

  const isLatestPublishedPackageRevision =
    packageRevision && isLatestPublishedRevision(packageRevision);

  if (!latestPublishedRevision) {
    throw new Error('Latest published revision cannot be found');
  }

  if (!isLatestPublishedPackageRevision) {
    return (
      <Fragment>
        <MaterialButton
          onClick={() => onClick(RevisionOption.RESTORE_REVISION)}
          color="primary"
          variant="outlined"
          disabled={disabled}
        >
          Restore Revision
        </MaterialButton>

        <Button
          to={packageRef({
            repositoryName: latestPublishedRevision.spec.repository,
            packageName: latestPublishedRevision.metadata.name,
          })}
          color="primary"
          variant="outlined"
          disabled={disabled}
        >
          View Latest Published Revision
        </Button>
      </Fragment>
    );
  }

  if (latestRevision !== latestPublishedRevision) {
    return (
      <Button
        to={packageRef({
          repositoryName,
          packageName: latestRevision.metadata.name,
        })}
        color="primary"
        variant="outlined"
      >
        View {latestRevision.spec.lifecycle} Revision
      </Button>
    );
  }

  const showDeploy =
    repositorySummary.downstreamRepositories.length > 0 &&
    canCloneOrDeploy(packageRevision);
  const showCreateSync =
    isDeploymentRepository(repositorySummary.repository) && rootSync === null;

  return (
    <Fragment>
      {isUpgradeAvailable && (
        <MaterialButton
          variant="outlined"
          color="primary"
          onClick={() => onClick(RevisionOption.CREATE_UPGRADE_REVISION)}
          disabled={disabled}
        >
          Upgrade to Latest Blueprint
        </MaterialButton>
      )}

      <MaterialButton
        variant="outlined"
        color="primary"
        onClick={() => onClick(RevisionOption.CREATE_NEW_REVISION)}
        disabled={disabled}
      >
        Create New Revision
      </MaterialButton>

      {showCreateSync && (
        <MaterialButton
          color="primary"
          variant="contained"
          onClick={() => onClick(RevisionOption.CREATE_SYNC)}
          disabled={disabled}
        >
          Create Sync
        </MaterialButton>
      )}

      {showDeploy && (
        <Button
          to={deployPackageRef({ repositoryName, packageName })}
          color="primary"
          variant="contained"
          disabled={disabled}
        >
          Deploy
        </Button>
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
