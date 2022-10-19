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
import { PersistentVolumeClaim } from './PersistentVolumeClaim';
import { PodTemplateSpec } from './Pod';

export type StatefulSet = {
  apiVersion: string;
  kind: string;
  metadata: StatefulSetMetadata;
  spec: StatefulSetSpec;
};

export type StatefulSetMetadata = {
  name: string;
  namespace?: string;
  labels?: KubernetesKeyValueObject;
  annotations?: KubernetesKeyValueObject;
};

export type StatefulSetSpec = {
  replicas?: number;
  selector: LabelSelector;
  serviceName: string;
  template: PodTemplateSpec;
  podManagementPolicy?: string;
  updateStrategy?: StatefulSetUpdateStrategy;
  revisionHistoryLimit?: number;
  minReadySeconds?: number;
  volumeClaimTemplates?: PersistentVolumeClaim[];
};

export type LabelSelector = {
  matchLabels: KubernetesKeyValueObject;
};

export type StatefulSetUpdateStrategy = {
  type?: string;
  rollingUpdate?: RollingUpdateStatefulSetStrategy;
};

export type RollingUpdateStatefulSetStrategy = {
  partition?: number;
  maxUnavailable?: number | string;
};
