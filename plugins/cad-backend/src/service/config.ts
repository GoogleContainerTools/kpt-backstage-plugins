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
  OIDC = 'oidc',
  SERVICE_ACCOUNT = 'service-account',
}

export enum OIDCTokenProvider {
  NONE = 'none',
  GOOGLE = 'google',
  OKTA = 'okta',
}

export const getResourcesNamespace = (config: Config): string => {
  const namespace = config.getString('resourcesNamespace');

  return namespace;
};

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

export const getClusterLocatorMethodOIDCTokenProvider = (
  config: Config,
): OIDCTokenProvider => {
  const authProvider = getClusterLocatorMethodAuthProvider(config);

  if (authProvider === ClusterLocatorAuthProvider.OIDC) {
    const oidcTokenProvider = config.getString(
      'clusterLocatorMethod.oidcTokenProvider',
    );

    if (!Object.values(OIDCTokenProvider)) {
      throw new Error(
        `Unknown clusterLocatorMethod.oidcTokenProvider, ${oidcTokenProvider}`,
      );
    }

    return oidcTokenProvider as OIDCTokenProvider;
  }

  return OIDCTokenProvider.NONE;
};

export const getClusterLocatorMethodServiceAccountToken = (
  config: Config,
): string => {
  const authProvider = getClusterLocatorMethodAuthProvider(config);

  if (authProvider === ClusterLocatorAuthProvider.SERVICE_ACCOUNT) {
    return config.getString('clusterLocatorMethod.serviceAccountToken');
  }

  return '';
};
