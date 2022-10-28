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

import { createApiRef } from '@backstage/core-plugin-api';
import { ListApiGroups } from '../types/ApiGroup';
import { ListConfigManagements } from '../types/ConfigManagement';
import { Function } from '../types/Function';
import { PackageRevision } from '../types/PackageRevision';
import {
  ListPackageRevisionResources,
  PackageRevisionResources,
} from '../types/PackageRevisionResource';
import { ListRepositories, Repository } from '../types/Repository';
import { ListRootSyncs, RootSync } from '../types/RootSync';
import { ListSecrets, Secret } from '../types/Secret';

export type ConfigAsDataApi = {
  getFeatures(): Promise<void>;

  listApiGroups(): Promise<ListApiGroups>;

  listConfigManagements(): Promise<ListConfigManagements>;

  createSecret(secret: Secret): Promise<Secret>;

  getSecret(name: string): Promise<Secret>;

  deleteSecret(name: string, namespace?: string): Promise<void>;

  listSecrets(): Promise<ListSecrets>;

  registerRepository(repository: Repository): Promise<Repository>;

  listRepositories(): Promise<ListRepositories>;

  getRepository(name: string): Promise<Repository>;

  unregisterRepository(repositoryName: string): Promise<void>;

  createPackageRevision(
    packageRevision: PackageRevision,
  ): Promise<PackageRevision>;

  listPackageRevisions(repositoryName?: string): Promise<PackageRevision[]>;

  getPackageRevision(fullPackageName: string): Promise<PackageRevision>;

  replacePackageRevision(
    packageRevision: PackageRevision,
  ): Promise<PackageRevision>;

  approvePackageRevision(
    packageRevision: PackageRevision,
  ): Promise<PackageRevision>;

  deletePackageRevision(fullPackageName: string): Promise<void>;

  replacePackageRevisionResources(
    packageRevisionResources: PackageRevisionResources,
  ): Promise<PackageRevisionResources>;

  getPackageRevisionResources(
    packageName: string,
  ): Promise<PackageRevisionResources>;

  listPackageRevisionResources(): Promise<ListPackageRevisionResources>;

  listCatalogFunctions(): Promise<Function[]>;

  listFunctions(repositoryName?: string): Promise<Function[]>;

  listRootSyncs(): Promise<ListRootSyncs>;

  getRootSync(name: string): Promise<RootSync>;

  createRootSync(sync: RootSync): Promise<RootSync>;

  deleteRootSync(name: string): Promise<void>;
};

export const configAsDataApiRef = createApiRef<ConfigAsDataApi>({
  id: 'plugin.config-as-data.service',
});
