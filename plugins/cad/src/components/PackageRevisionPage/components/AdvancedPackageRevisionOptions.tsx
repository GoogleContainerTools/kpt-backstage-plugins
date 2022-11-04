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

import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { Button } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { configAsDataApiRef } from '../../../apis';
import { repositoryRouteRef } from '../../../routes';
import { Repository } from '../../../types/Repository';
import { RootSync } from '../../../types/RootSync';
import {
  getPackageDescriptor,
  isReadOnlyRepository,
} from '../../../utils/repository';
import { toLowerCase } from '../../../utils/string';
import { ConfirmationDialog } from '../../Controls/ConfirmationDialog';

type AdvancedPackageRevisionOptionsProps = {
  repository: Repository;
  packageName: string;
  rootSync?: RootSync | null;
};

export const AdvancedPackageRevisionOptions = ({
  repository,
  packageName,
  rootSync,
}: AdvancedPackageRevisionOptionsProps) => {
  const [openPackageDialog, setOpenPackageDialog] = useState(false);
  const [openSyncDialog, setOpenSyncDialog] = useState(false);

  const api = useApi(configAsDataApiRef);

  const navigate = useNavigate();
  const repositoryRef = useRouteRef(repositoryRouteRef);

  const repositoryName = repository.metadata.name;

  const openDeletePackageRevisionDialog = (): void => {
    setOpenPackageDialog(true);
  };

  const closeDeletePackageRevisionDialog = (): void => {
    setOpenPackageDialog(false);
  };

  const deleteSync = async (): Promise<void> => {
    if (rootSync) {
      const syncSecretName = rootSync.spec.git.secretRef?.name;

      await api.deleteRootSync(rootSync.metadata.name);

      if (syncSecretName) {
        await api.deleteSecret(syncSecretName, rootSync.metadata.namespace);
      }
    }
  };

  const executeDeletePackageRevision = async (): Promise<void> => {
    await deleteSync();
    await api.deletePackageRevision(packageName);

    navigate(repositoryRef({ repositoryName }));
  };

  const openDeleteSyncDialog = (): void => {
    setOpenSyncDialog(true);
  };

  const closeDeleteSyncDialog = (): void => {
    setOpenSyncDialog(false);
  };

  const executeDeleteSync = async (): Promise<void> => {
    await deleteSync();

    navigate(repositoryRef({ repositoryName }));
  };

  if (isReadOnlyRepository(repository)) {
    return (
      <Alert severity="info">
        Advanced options are hidden since this{' '}
        {toLowerCase(getPackageDescriptor(repository))} is read-only.
      </Alert>
    );
  }

  return (
    <Fragment>
      <ConfirmationDialog
        open={openPackageDialog}
        onClose={closeDeletePackageRevisionDialog}
        title="Delete revision"
        contentText="Are you sure you want to delete this revision?"
        actionText="Delete"
        onAction={executeDeletePackageRevision}
      />

      <div>
        <Button
          color="secondary"
          variant="contained"
          onClick={openDeletePackageRevisionDialog}
        >
          Delete revision
        </Button>
      </div>

      {rootSync && (
        <div style={{ marginTop: '12px' }}>
          <ConfirmationDialog
            open={openSyncDialog}
            onClose={closeDeleteSyncDialog}
            title="Delete sync"
            contentText="Are you sure you want to delete the sync?"
            actionText="Delete"
            onAction={executeDeleteSync}
          />

          <Button
            color="secondary"
            variant="contained"
            onClick={openDeleteSyncDialog}
          >
            Delete Sync
          </Button>
        </div>
      )}
    </Fragment>
  );
};
