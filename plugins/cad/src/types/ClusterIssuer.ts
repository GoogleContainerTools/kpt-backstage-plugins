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

export type ClusterIssuer = {
  kind: string;
  apiVersion: string;
  metadata: ClusterIssuerMetadata;
  spec: ClusterIssuerSpec;
};

export type ClusterIssuerMetadata = {
  name: string;
  namespace?: string;
  labels?: KubernetesKeyValueObject;
  annotations?: KubernetesKeyValueObject;
};

export type ClusterIssuerSpec = {
  acme: ACMEIssuer;
};

export type ACMEIssuer = {
  server: string;
  email?: string;
  privateKeySecretRef?: ACMEIssuerPrivateKeySecretRef;
};

export type ACMEIssuerPrivateKeySecretRef = {
  name: string;
};
