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
  KubernetesKeyValueObject,
  KubernetesResource,
} from '../../../../../../types/KubernetesResource';
import { Secret } from '../../../../../../types/Secret';
import { Metadata } from '../StructuredMetadata';

const getSecrets = (
  data: KubernetesKeyValueObject | undefined,
  stringData: KubernetesKeyValueObject | undefined,
): KubernetesKeyValueObject | undefined => {
  const secretData: KubernetesKeyValueObject = {};

  if (data) {
    const keys = Object.keys(data);
    for (const key of keys) {
      secretData[key] = Buffer.from(data[key], 'base64').toString();
    }
  }

  if (stringData) {
    const keys = Object.keys(stringData);
    for (const key of keys) {
      secretData[key] = stringData[key];
    }
  }

  return Object.keys(secretData).length > 0 ? secretData : undefined;
};

export const getSecretStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const secret = resource as Secret;

  return {
    type: `${secret.type} ${secret.immutable ? '(immutable)' : ''}`,
    secrets: getSecrets(secret.data, secret.stringData) ?? 'none',
  };
};
