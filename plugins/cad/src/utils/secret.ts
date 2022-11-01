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

import { KubernetesKeyValueObject } from '../types/KubernetesResource';
import { Secret } from '../types/Secret';

export const getBasicAuthSecret = (
  name: string,
  username: string,
  password: string,
): Secret => {
  const basicAuthSecret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: name,
    },
    type: 'kubernetes.io/basic-auth',
    data: {
      username: btoa(username),
      password: btoa(password),
    },
  };

  return basicAuthSecret;
};

export const getOpagueSecret = (
  name: string,
  namespace: string,
  data: KubernetesKeyValueObject,
): Secret => {
  const basicOpagueSecret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: name,
      namespace: namespace,
    },
    type: 'Opaque',
    data: data,
  };

  return basicOpagueSecret;
};

export const isBasicAuthSecret = (secret: Secret): boolean => {
  return secret.type === 'kubernetes.io/basic-auth';
};
