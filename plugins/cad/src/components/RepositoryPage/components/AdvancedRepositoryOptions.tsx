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
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';
import React, { Fragment, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { configAsDataApiRef } from '../../../apis';
import { rootRouteRef } from '../../../routes';

export const AdvancedRepositoryOptions = () => {
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
    await api.unregisterRepository(repositoryName);
    navigate(repositoriesRef());
  };

  return (
    <Fragment>
      <Dialog open={open} onClose={closeUnregisterRepositoryDialog}>
        <DialogTitle>Unregister repository</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unregister this repository?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={closeUnregisterRepositoryDialog}>
            Cancel
          </Button>
          <Button color="primary" onClick={executeUnregisterRepository}>
            Unregister
          </Button>
        </DialogActions>
      </Dialog>

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
