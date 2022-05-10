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

import { PackageRevision } from '../types/PackageRevision';
import { Repository } from '../types/Repository';
import {
  RootSync,
  RootSyncGit,
  RootSyncStatus,
  RootSyncStatusCondition,
  SyncConditionStatus,
  SyncConditionType,
  SyncError,
} from '../types/RootSync';
import { Secret } from '../types/Secret';
import { getOpagueSecret } from './secret';

export enum SyncStatusState {
  STALLED = 'Stalled',
  RECONCILING = 'Reconciling',
  PENDING = 'Pending',
  SYNCED = 'Synced',
  ERROR = 'Error',
}

export type SyncStatus = {
  errors?: string[];
  state: SyncStatusState;
};

export const getRootSync = (
  repository: Repository,
  packageRevision: PackageRevision,
  secretName?: string,
): RootSync => {
  const syncName = packageRevision.spec.packageName;
  const gitRepository = repository.spec.git;

  if (!gitRepository) {
    throw new Error('RootSyncs can only be generated for git repositories');
  }

  const rootSync: RootSync = {
    apiVersion: 'configsync.gke.io/v1beta1',
    kind: 'RootSync',
    metadata: {
      name: syncName,
      namespace: 'config-management-system',
    },
    spec: {
      sourceFormat: 'unstructured',
      git: {
        repo: gitRepository.repo,
        revision: `${packageRevision.spec.packageName}/${packageRevision.spec.revision}`,
        dir: packageRevision.spec.packageName,
        branch: gitRepository.branch,
      },
    },
  };

  if (secretName) {
    rootSync.spec.git.auth = 'token';
    rootSync.spec.git.secretRef = {
      name: secretName,
    };
  }

  return rootSync;
};

export const getRootSyncSecret = (
  name: string,
  repositorySecret: Secret,
): Secret => {
  const data = {
    username: repositorySecret.data.username,
    token: repositorySecret.data.password,
  };

  const opagueSecret = getOpagueSecret(name, 'config-management-system', data);

  return opagueSecret;
};

export const findRootSyncForPackage = (
  syncs: RootSync[],
  packageRevision: PackageRevision,
  repository: Repository,
): RootSync | undefined => {
  const gitRepository = repository.spec.git;

  if (!gitRepository) return undefined;

  const expectedSyncGitSpec = {
    repo: gitRepository.repo,
    revision: `${packageRevision.spec.packageName}/${packageRevision.spec.revision}`,
    dir: packageRevision.spec.packageName,
    branch: gitRepository.branch,
  };

  const hashSyncGitSpec = (git: RootSyncGit): string =>
    `${git.repo}|${git.revision}|${git.dir}|${git.branch}`;

  return syncs.find(
    sync =>
      hashSyncGitSpec(expectedSyncGitSpec) === hashSyncGitSpec(sync.spec.git),
  );
};

export const getSyncStatus = (syncStatus: RootSyncStatus): SyncStatus => {
  const stalledCondition = syncStatus.conditions.find(
    c =>
      c.type === SyncConditionType.STALLED &&
      c.status === SyncConditionStatus.TRUE,
  );
  if (stalledCondition) {
    return {
      state: SyncStatusState.STALLED,
      errors: [stalledCondition.message],
    };
  }

  const reconcilingCondition = syncStatus.conditions.find(
    c =>
      c.type === SyncConditionType.RECONCILING &&
      c.status === SyncConditionStatus.TRUE,
  );
  if (reconcilingCondition) {
    return {
      state: SyncStatusState.RECONCILING,
    };
  }

  const syncingCondition = syncStatus.conditions.find(
    c => c.type === SyncConditionType.SYNCING,
  );
  if (!syncingCondition) {
    return {
      state: SyncStatusState.PENDING,
    };
  }

  const getErrors = (condition: RootSyncStatusCondition): string[] => {
    if (condition.errorSummary) {
      const syncErrors: SyncError[] = [
        ...(syncStatus.source.errors ?? []),
        ...(syncStatus.rendering.errors ?? []),
        ...(syncStatus.sync.errors ?? []),
      ];
      return syncErrors.map(e => e.errorMessage);
    }

    if (condition.errors) {
      condition.errors.map(e => e.errorMessage);
    }

    return [];
  };

  const syncingErrors = getErrors(syncingCondition);

  if (syncingCondition.status === SyncConditionStatus.TRUE) {
    return {
      state: SyncStatusState.PENDING,
      errors: getErrors(syncingCondition),
    };
  }

  if (syncingErrors.length === 0) {
    return {
      state: SyncStatusState.SYNCED,
    };
  }

  return {
    state: SyncStatusState.ERROR,
    errors: getErrors(syncingCondition),
  };
};
