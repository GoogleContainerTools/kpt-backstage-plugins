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
  DiscoveryApi,
  FetchApi,
  OAuthApi,
  OpenIdConnectApi,
} from '@backstage/core-plugin-api';
import { ConfigAsDataApi } from '.';
import { ListApiGroups } from '../types/ApiGroup';
import { ListConfigManagements } from '../types/ConfigManagement';
import { Function } from '../types/Function';
import { KubernetesStatus } from '../types/KubernetesStatus';
import { PackageRevision } from '../types/PackageRevision';
import {
  ListPackageRevisionResources,
  PackageRevisionResources,
} from '../types/PackageRevisionResource';
import { ListRepositories, Repository } from '../types/Repository';
import { ListRootSyncs, RootSync } from '../types/RootSync';
import { ListSecrets, Secret } from '../types/Secret';

type KptFunctionCatalog = {
  [functionName: string]: KptFunctionMinorVersion;
};

type KptFunctionMinorVersion = {
  [minorVersion: string]: KptFunctionMinorVersinDetails;
};

type KptFunctionMinorVersinDetails = {
  LatestPatchVersion: string;
  Types: string[] | null;
  Keywords: string[] | null;
};

export class FetchError extends Error {
  responseText?: string;

  static async forResponse(
    method: string,
    response: Response,
  ): Promise<FetchError> {
    const requestDescription = `${method} ${response.url}`;
    const statusDescription = `${response.status} ${response.statusText}`;

    const responseText = await response.text();

    const newFetchError = new FetchError(
      `${statusDescription}, ${requestDescription}`,
    );
    newFetchError.responseText = responseText;

    return newFetchError;
  }
}

class KubernetesStatusError extends Error {
  constructor(status: KubernetesStatus) {
    super(status.message);
  }
}

export class PorchRestAPI implements ConfigAsDataApi {
  private authentication: string = 'none';

  constructor(
    private discovery: DiscoveryApi,
    private fetchApi: FetchApi,
    private googleAuthApi: OAuthApi & OpenIdConnectApi,
    private oktaAuthApi: OpenIdConnectApi,
  ) {}

  private async getAuthorizationToken(): Promise<string | undefined> {
    const authProvider = this.authentication;

    if (authProvider === 'google') {
      const googleAccessToken = await this.googleAuthApi.getAccessToken(
        'https://www.googleapis.com/auth/cloud-platform.read-only',
      );

      return `Bearer ${googleAccessToken}`;
    }

    if (authProvider === 'oidc.google') {
      const googleIdToken = await this.googleAuthApi.getIdToken();

      return `Bearer ${googleIdToken}`;
    }

    if (authProvider === 'oidc.okta') {
      const oktaIdToken = await this.oktaAuthApi.getIdToken();

      return `Bearer ${oktaIdToken}`;
    }

    if (authProvider === 'none') {
      return undefined;
    }

    throw new Error(`Authentication provider ${authProvider} not found`);
  }

  private async cadFetch(path: string, init?: RequestInit): Promise<any> {
    const fetchInit = init ?? {};

    fetchInit.headers = fetchInit.headers || {};

    const authorization = await this.getAuthorizationToken();

    if (authorization) {
      fetchInit.headers = {
        ...fetchInit.headers,
        authorization,
      };
    }

    if (fetchInit.method !== 'GET' && fetchInit.body) {
      fetchInit.headers = {
        ...fetchInit.headers,
        'Content-Type': 'application/json',
      };
    }

    const baseUrl = await this.discovery.getBaseUrl('config-as-data');
    const response = await this.fetchApi.fetch(`${baseUrl}/${path}`, fetchInit);

    if (!response.ok) {
      const method = fetchInit.method || 'GET';

      const fetchError = await FetchError.forResponse(method, response);

      if (
        fetchError.responseText &&
        fetchError.responseText.includes('"kind":"Status"')
      ) {
        const k8Status = JSON.parse(
          fetchError.responseText,
        ) as KubernetesStatus;

        throw new KubernetesStatusError(k8Status);
      }

      throw fetchError;
    }

    return await response.json();
  }

  async getFeatures(): Promise<void> {
    const features = await this.cadFetch('v1/features');

    this.authentication = features.authentication;
  }

  async listApiGroups(): Promise<ListApiGroups> {
    const apiGroups = await this.cadFetch('apis');

    return apiGroups;
  }

  async listConfigManagements(): Promise<ListConfigManagements> {
    const configManagements = await this.cadFetch(
      'apis/configmanagement.gke.io/v1/configmanagements',
    );

    return configManagements;
  }

  async createSecret(secret: Secret): Promise<Secret> {
    const namespace = secret.metadata.namespace || 'default';

    const newSecret = await this.cadFetch(
      `api/v1/namespaces/${namespace}/secrets`,
      {
        method: 'POST',
        body: JSON.stringify(secret),
      },
    );

    return newSecret;
  }

  async getSecret(name: string): Promise<Secret> {
    const newSecret = await this.cadFetch(
      `api/v1/namespaces/default/secrets/${name}`,
    );

    return newSecret;
  }

  async deleteSecret(
    name: string,
    namespace: string = 'default',
  ): Promise<void> {
    await this.cadFetch(`api/v1/namespaces/${namespace}/secrets/${name}`, {
      method: 'DELETE',
    });
  }

  async listSecrets(): Promise<ListSecrets> {
    const secretsList = await this.cadFetch(
      'api/v1/namespaces/default/secrets',
    );

    return secretsList;
  }

  async registerRepository(repository: Repository): Promise<Repository> {
    const registeredRepository = await this.cadFetch(
      'apis/config.porch.kpt.dev/v1alpha1/namespaces/default/repositories',
      {
        method: 'POST',
        body: JSON.stringify(repository),
      },
    );

    return registeredRepository;
  }

  async listRepositories(): Promise<ListRepositories> {
    const listResponse = await this.cadFetch(
      'apis/config.porch.kpt.dev/v1alpha1/namespaces/default/repositories',
    );

    return listResponse;
  }

  async getRepository(name: string): Promise<Repository> {
    const repository = await this.cadFetch(
      `apis/config.porch.kpt.dev/v1alpha1/namespaces/default/repositories/${name}`,
    );

    return repository;
  }

  async unregisterRepository(repositoryName: string): Promise<void> {
    await this.cadFetch(
      `apis/config.porch.kpt.dev/v1alpha1/namespaces/default/repositories/${repositoryName}`,
      {
        method: 'DELETE',
      },
    );
  }

  async createPackageRevision(
    packageRevision: PackageRevision,
  ): Promise<PackageRevision> {
    const newPackageRevision = await this.cadFetch(
      'apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisions',
      {
        method: 'POST',
        body: JSON.stringify(packageRevision),
      },
    );

    return newPackageRevision;
  }

  async listPackageRevisions(
    repositoryName?: string,
  ): Promise<PackageRevision[]> {
    const listResponse = await this.cadFetch(
      'apis/porch.kpt.dev/v1alpha1/packagerevisions',
    );

    const packageRevisions = repositoryName
      ? listResponse.items.filter(
          (packageRevision: PackageRevision) =>
            packageRevision.spec.repository === repositoryName,
        )
      : listResponse.items;

    return packageRevisions;
  }

  async getPackageRevision(fullPackageName: string): Promise<PackageRevision> {
    const packageRevision = await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisions/${fullPackageName}`,
    );

    return packageRevision;
  }

  async replacePackageRevision(
    packageRevision: PackageRevision,
  ): Promise<PackageRevision> {
    const newPackageRevision = await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisions/${packageRevision.metadata.name}`,
      {
        method: 'PUT',
        body: JSON.stringify(packageRevision),
      },
    );

    return newPackageRevision;
  }

  async approvePackageRevision(
    packageRevision: PackageRevision,
  ): Promise<PackageRevision> {
    const approvedPackageRevision = await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisions/${packageRevision.metadata.name}/approval`,
      {
        method: 'PUT',
        body: JSON.stringify(packageRevision),
      },
    );

    return approvedPackageRevision;
  }

  async deletePackageRevision(fullPackageName: string): Promise<void> {
    await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisions/${fullPackageName}`,
      {
        method: 'DELETE',
      },
    );
  }

  async replacePackageRevisionResources(
    packageRevisionResources: PackageRevisionResources,
  ): Promise<PackageRevisionResources> {
    const packageName = packageRevisionResources.metadata.name;

    const resourcesResponse = await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisionresources/${packageName}`,
      {
        method: 'PUT',
        body: JSON.stringify(packageRevisionResources),
      },
    );

    return resourcesResponse;
  }

  async getPackageRevisionResources(
    packageName: string,
  ): Promise<PackageRevisionResources> {
    const resourcesResponse = await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisionresources/${packageName}`,
    );

    return resourcesResponse;
  }

  async listPackageRevisionResources(): Promise<ListPackageRevisionResources> {
    const resourcesResponse = await this.cadFetch(
      `apis/porch.kpt.dev/v1alpha1/namespaces/default/packagerevisionresources`,
    );

    return resourcesResponse;
  }

  async listCatalogFunctions(): Promise<Function[]> {
    const functionCatalog: KptFunctionCatalog = await this.cadFetch(
      'v1/function-catalog',
    );

    const functions: Function[] = [];

    for (const fnName of Object.keys(functionCatalog)) {
      for (const minorVersion of Object.keys(functionCatalog[fnName])) {
        const thisFunctionJson = functionCatalog[fnName][minorVersion];

        const functionName = `${fnName}:${thisFunctionJson.LatestPatchVersion}`;
        const thisFunction: Function = {
          apiVersion: 'porch.kpt.dev/v1alpha1',
          kind: 'Function',
          metadata: {
            name: functionName,
          },
          spec: {
            description: '',
            image: `gcr.io/kpt-fn/${functionName}`,
            functionTypes: thisFunctionJson.Types ?? [],
            keywords: thisFunctionJson.Keywords ?? [],
            repositoryRef: {
              name: 'https://catalog.kpt.dev/catalog-v2.json',
            },
          },
        };

        functions.push(thisFunction);
      }
    }

    return functions;
  }

  async listFunctions(repositoryName?: string): Promise<Function[]> {
    const listResponse = await this.cadFetch(
      'apis/porch.kpt.dev/v1alpha1/functions',
    );

    const functions = repositoryName
      ? listResponse.items.filter(
          (kptFunction: Function) =>
            kptFunction.spec.repositoryRef.name === repositoryName,
        )
      : listResponse.items;

    return functions;
  }

  async listRootSyncs(): Promise<ListRootSyncs> {
    const rootSyncs = await this.cadFetch(
      'apis/configsync.gke.io/v1beta1/namespaces/config-management-system/rootsyncs',
    );

    return rootSyncs;
  }

  async getRootSync(name: string): Promise<RootSync> {
    const rootSync = await this.cadFetch(
      `apis/configsync.gke.io/v1beta1/namespaces/config-management-system/rootsyncs/${name}`,
    );

    return rootSync;
  }

  async createRootSync(sync: RootSync): Promise<RootSync> {
    const newSync = await this.cadFetch(
      'apis/configsync.gke.io/v1beta1/namespaces/config-management-system/rootsyncs',
      {
        method: 'POST',
        body: JSON.stringify(sync),
      },
    );

    return newSync;
  }

  async deleteRootSync(name: string): Promise<void> {
    await this.cadFetch(
      `apis/configsync.gke.io/v1beta1/namespaces/config-management-system/rootsyncs/${name}`,
      {
        method: 'DELETE',
      },
    );
  }
}
