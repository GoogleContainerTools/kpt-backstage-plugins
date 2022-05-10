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

import { KubernetesKeyValueObject } from './KubernetesResource';

export type ListRootSyncs = {
  kind: string;
  apiVersion: string;
  items: RootSync[];
};

export type RootSync = {
  apiVersion: string;
  kind: string;
  metadata: RootSyncMetadata;
  spec: RootSyncSpec;
  status?: RootSyncStatus;
};

export type RootSyncMetadata = {
  name: string;
  namespace: string;
  labels?: KubernetesKeyValueObject;
  annotations?: KubernetesKeyValueObject;
};

export type RootSyncSpec = {
  sourceFormat: string;
  git: RootSyncGit;
};

export type RootSyncGit = {
  repo: string;
  dir: string;
  revision?: string;
  branch: string;
  auth?: string;
  secretRef?: RootSyncSecretRef;
};

export type RootSyncSecretRef = {
  name: string;
};

export type RootSyncStatus = {
  conditions: RootSyncStatusCondition[];
  source: RootSyncStatusSource;
  sync: RootSyncStatusSync;
  rendering: RootSyncStatusRendering;
};

export type RootSyncStatusSource = {
  errors?: SyncError[];
  commit: string;
};

export type RootSyncStatusSync = {
  errors?: SyncError[];
  commit: string;
};
export type RootSyncStatusRendering = {
  errors?: SyncError[];
  commit: string;
};

export enum SyncConditionType {
  STALLED = 'Stalled',
  RECONCILING = 'Reconciling',
  SYNCING = 'Syncing',
}

export enum SyncConditionStatus {
  TRUE = 'True',
  FALSE = 'False',
}

export type SyncStatusConditionErrorSummary = {
  totalCount?: number;
};

export type RootSyncStatusCondition = {
  message: string;
  status: string;
  type: string;
  reason: string;
  errors?: SyncError[];
  errorSummary?: SyncStatusConditionErrorSummary;
};

export type SyncError = {
  code: string;
  errorMessage: string;
};
