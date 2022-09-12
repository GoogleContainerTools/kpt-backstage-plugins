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
import { Button, makeStyles } from '@material-ui/core';
import React, { Fragment, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { configAsDataApiRef } from '../../../apis';
import { rootRouteRef } from '../../../routes';
import { RepositorySummary } from '../../../types/RepositorySummary';
import { ConfirmationDialog } from '../../Controls';
import { RepositoryDetails } from './RepositoryDetails';

type AdvancedRepositoryOptionsProps = {
  repositorySummary: RepositorySummary;
};

const useStyles = makeStyles({
  repositoryDetails: {
    maxWidth: '800px',
    marginBottom: '16px',
  },
});

export const AdvancedRepositoryOptions = ({
  repositorySummary,
}: AdvancedRepositoryOptionsProps) => {
  const classes = useStyles();

  const { repositoryName } = useParams();
  const api = useApi(configAsDataApiRef);

  const repositoriesRef = useRouteRef(rootRouteRef);

  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const openUnregisterRepositoryDialog = (): void => {
    setOpen(true);
  };

  const closeUnregisterRepositoryDialog = (): void => {
    setOpen(false);
  };

  const executeUnregisterRepository = async (): Promise<void> => {
    const checkUsedByOtherRepository = async (
      secretName: string,
    ): Promise<boolean> => {
      const { items: repositories } = await api.listRepositories();
      const isSecretShared = repositories.some(
        repository =>
          repository.metadata.name !== repositoryName &&
          repository.spec.git?.secretRef?.name === secretName,
      );
      return isSecretShared;
    };

    const repoSecretName =
      repositorySummary.repository.spec.git?.secretRef?.name;
    const repoNamespace = repositorySummary.repository.metadata.namespace;

    if (repoSecretName && !(await checkUsedByOtherRepository(repoSecretName))) {
      await Promise.all([
        api.unregisterRepository(repositoryName),
        api.deleteSecret(repoSecretName, repoNamespace),
      ]);
    } else {
      await api.unregisterRepository(repositoryName);
    }
    navigate(repositoriesRef());
  };

  return (
    <Fragment>
      <ConfirmationDialog
        open={open}
        onClose={closeUnregisterRepositoryDialog}
        title="Unregister repository"
        contentText="Are you sure you want to unregister this repository?"
        actionText="Unregister"
        onAction={executeUnregisterRepository}
      />

      <div className={classes.repositoryDetails}>
        <RepositoryDetails repositorySummary={repositorySummary} />
      </div>

      <Button
        color="secondary"
        variant="contained"
        onClick={openUnregisterRepositoryDialog}
      >
        Unregister Repository
      </Button>
    </Fragment>
  );
};
