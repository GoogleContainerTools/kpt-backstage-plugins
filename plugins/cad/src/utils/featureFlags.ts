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

import { ConfigAsDataApi } from '../apis';

let isConfigSyncInstalled = false;

export const isConfigSyncEnabled = (): boolean => isConfigSyncInstalled;

export const allowFunctionRepositoryRegistration = (): boolean => false;

export const showRegisteredFunctionRepositories = (): boolean => false;

export const loadFeatures = async (api: ConfigAsDataApi): Promise<void> => {
  await api.getFeatures();

  const { groups } = await api.listApiGroups();

  const configManagementGroupExists = !!groups.find(
    apiGroup => apiGroup.name === 'configmanagement.gke.io',
  );

  if (configManagementGroupExists) {
    const { items: configManagements } = await api.listConfigManagements();

    isConfigSyncInstalled = configManagements.length > 0;
  }
};
