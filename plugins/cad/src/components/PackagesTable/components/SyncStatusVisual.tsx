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

import {
  StatusError,
  StatusOK,
  StatusPending,
  StatusWarning,
} from '@backstage/core-components';
import React, { Fragment } from 'react';
import { SyncStatus, SyncStatusState } from '../../../utils/configSync';

type SyncStatusVisualProps = {
  syncStatus: SyncStatus | undefined | null;
};

export const SyncStatusVisual = ({ syncStatus }: SyncStatusVisualProps) => {
  if (syncStatus) {
    switch (syncStatus.state) {
      case SyncStatusState.SYNCED:
        return (
          <Fragment>
            <StatusOK />
            {syncStatus.state}
          </Fragment>
        );
      case SyncStatusState.RECONCILING:
      case SyncStatusState.PENDING:
        return (
          <Fragment>
            <StatusPending />
            {syncStatus.state}
          </Fragment>
        );
      case SyncStatusState.STALLED:
      case SyncStatusState.ERROR:
        return (
          <Fragment>
            <StatusError />
            {syncStatus.state}
          </Fragment>
        );
      default:
    }
  }

  if (syncStatus === null) {
    return (
      <Fragment>
        <StatusWarning />
        Not installed
      </Fragment>
    );
  }

  return <Fragment />;
};
