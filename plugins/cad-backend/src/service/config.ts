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

import { Config } from '@backstage/config';

export enum ClusterLocatorMethodType {
  CURRENT_CONTEXT = 'current-context',
  IN_CLUSTER = 'in-cluster',
}

export enum ClusterLocatorAuthProvider {
  CURRENT_CONTEXT = 'current-context',
  GOOGLE = 'google',
}

export const getClusterLocatorMethodType = (
  config: Config,
): ClusterLocatorMethodType => {
  const methodType = config.getString('clusterLocatorMethod.type');

  if (!Object.values(ClusterLocatorAuthProvider)) {
    throw new Error(`Unknown clusterLocatorMethod.type, ${methodType}`);
  }

  return methodType as ClusterLocatorMethodType;
};

export const getClusterLocatorMethodAuthProvider = (
  config: Config,
): ClusterLocatorAuthProvider => {
  const authProvider = config.getString('clusterLocatorMethod.authProvider');

  if (!Object.values(ClusterLocatorAuthProvider)) {
    throw new Error(
      `Unknown clusterLocatorMethod.authProvider, ${authProvider}`,
    );
  }

  return authProvider as ClusterLocatorAuthProvider;
};
