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

import { cloneDeep } from 'lodash';
import { ConfigAsDataApi } from '../../../apis';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import { processApplyReplacementsUpdates } from './resources/applyReplacements';

type ProcessMapFn = (
  api: ConfigAsDataApi,
  originalMap: PackageRevisionResourcesMap,
  currentMap: PackageRevisionResourcesMap,
) => Promise<PackageRevisionResourcesMap>;

export const processUpdatedResourcesMap = async (
  api: ConfigAsDataApi,
  originalMap: PackageRevisionResourcesMap,
  currentMap: PackageRevisionResourcesMap,
): Promise<PackageRevisionResourcesMap> => {
  const processMapFns: ProcessMapFn[] = [processApplyReplacementsUpdates];

  let resourcesMap = cloneDeep(currentMap);

  for (const processMapFn of processMapFns) {
    resourcesMap = await processMapFn(api, originalMap, resourcesMap);
  }

  return resourcesMap;
};
