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

export type Ingress = {
  apiVersion: string;
  kind: string;
  metadata: IngressMetadata;
  spec: IngressSpec;
};

export type IngressMetadata = {
  name: string;
  namespace?: string;
  labels?: KubernetesKeyValueObject;
  annotations?: KubernetesKeyValueObject;
};

export type IngressSpec = {
  tls?: IngressTls[];
  ingressClassName?: string;
  defaultBackend?: IngressBackend;
  rules?: IngressRule[];
};

export type IngressTls = {
  hosts: string[];
  secretName: string;
};

export type IngressRule = {
  host?: string;
  http?: IngressRuleHttp;
};

export type IngressRuleHttp = {
  paths: IngressRuleHttpPath[];
};

export type IngressRuleHttpPath = {
  pathType: string;
  path: string;
  backend: IngressBackend;
};

export type IngressBackend = {
  service?: IngressServiceBackend;
  resource?: IngressResourceBackend;
};

export type IngressServiceBackend = {
  name: string;
  port: IngressRuleHttppathBackendServicePort;
};

export type IngressRuleHttppathBackendServicePort = {
  number: number;
};

export type IngressResourceBackend = {
  apiGroup?: string;
  kind: string;
  name: string;
};
