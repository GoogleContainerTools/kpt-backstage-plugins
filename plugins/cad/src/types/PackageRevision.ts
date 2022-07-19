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

export type PackageRevision = {
  kind: string;
  apiVersion: string;
  metadata: PackageRevisionMetadata;
  spec: PackageRevisionSpec;
  status?: PackageRevisionStatus;
};

export type PackageRevisionMetadata = {
  name: string;
  namespace: string;
  creationTimestamp?: string;
  labels?: KubernetesKeyValueObject;
};

export type PackageRevisionSpec = {
  packageName: string;
  repository: string;
  revision: string;
  lifecycle: PackageRevisionLifecycle;
  tasks: PackageRevisionTask[];
};

export enum PackageRevisionLifecycle {
  DRAFT = 'Draft',
  PROPOSED = 'Proposed',
  PUBLISHED = 'Published',
}

export type PackageRevisionTask = {
  type: string;
  init?: PackageRevisionTaskInit;
  clone?: PackageRevisionTaskClone;
  update?: PackageRevisionTaskUpdate;
  eval?: PackageRevisionTaskEval;
};

export type PackageRevisionTaskInit = {
  description: string;
  keywords?: string[];
  site?: string;
};

export type PackageRevisionTaskClone = {
  upstreamRef: PackageRevisionTaskUpstreamRef;
};

export type PackageRevisionTaskUpdate = {
  upstreamRef: PackageRevisionTaskUpstreamRef;
};

export type PackageRevisionTaskUpstreamRef = {
  upstreamRef: PackageRevisionTaskNamedRepository;
};

export type PackageRevisionTaskNamedRepository = {
  name: string;
};

export type PackageRevisionTaskEval = {
  image: string;
  configMap: PackageRevisionTaskEvalConfigMap;
};

export type PackageRevisionTaskEvalConfigMap = {
  [key: string]: string;
};

export type PackageRevisionStatus = {
  upstreamLock?: PackageRevisionStatusUpstreamLock;
};

export type PackageRevisionStatusUpstreamLock = {
  git?: PackageRevisionStatusUpstreamLockGit;
  type: string;
};

export type PackageRevisionStatusUpstreamLockGit = {
  repo: string;
  directory: string;
  ref: string;
  commit: string;
};
