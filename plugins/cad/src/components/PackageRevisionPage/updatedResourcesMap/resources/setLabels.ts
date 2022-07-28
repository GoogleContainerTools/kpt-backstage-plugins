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

import { ConfigAsDataApi } from '../../../../apis';
import { Kptfile, KptfileFunction } from '../../../../types/Kptfile';
import { PackageRevisionResourcesMap } from '../../../../types/PackageRevisionResource';
import {
  getFunctionNameFromImage,
  groupFunctionsByName,
} from '../../../../utils/function';
import {
  diffPackageResources,
  getPackageResourcesFromResourcesMap,
  ResourceDiffStatus,
  updateResourceInResourcesMap,
} from '../../../../utils/packageRevisionResources';
import { dumpYaml, loadYaml } from '../../../../utils/yaml';

export const processSetLabelsUpdates = async (
  api: ConfigAsDataApi,
  originalResourcesMap: PackageRevisionResourcesMap,
  currentResourcesMap: PackageRevisionResourcesMap,
): Promise<PackageRevisionResourcesMap> => {
  const originalResources =
    getPackageResourcesFromResourcesMap(originalResourcesMap);
  const currentResources =
    getPackageResourcesFromResourcesMap(currentResourcesMap);

  const changedResources = diffPackageResources(
    originalResources,
    currentResources,
  );

  const setLabelsResourceDiffs = changedResources.filter(
    resource =>
      (resource.originalResource ?? resource.currentResource).kind ===
        'SetLabels' &&
      (resource.diffStatus === ResourceDiffStatus.ADDED ||
        resource.diffStatus === ResourceDiffStatus.REMOVED),
  );

  if (setLabelsResourceDiffs.length > 0) {
    const kptfileResource = currentResources.find(r => r.kind === 'Kptfile');

    if (kptfileResource) {
      const kptfileYaml = loadYaml(kptfileResource.yaml) as Kptfile;

      let mutatorsUpdated = false;
      let mutators = kptfileYaml.pipeline?.mutators ?? [];

      const findSetLabelsMutator = (
        configPath: string,
      ): KptfileFunction | undefined =>
        mutators.find(
          mutator =>
            getFunctionNameFromImage(mutator.image) === 'set-labels' &&
            mutator.configPath === configPath,
        );

      for (const setLabelsResourceDiff of setLabelsResourceDiffs) {
        const diffStatus = setLabelsResourceDiff.diffStatus;
        const isResourceAdded = diffStatus === ResourceDiffStatus.ADDED;
        const isResourceRemoved = diffStatus === ResourceDiffStatus.REMOVED;

        if (isResourceAdded) {
          const path = setLabelsResourceDiff.currentResource.filename;
          const setLabelsMutator = findSetLabelsMutator(path);

          if (!setLabelsMutator) {
            const allKptFunctions = await api.listCatalogFunctions();
            const kptFunctions = groupFunctionsByName(allKptFunctions);
            const setLabelsFn = kptFunctions['set-labels'];

            mutators.push({
              image: setLabelsFn[0].spec.image,
              configPath: path,
            });

            mutatorsUpdated = true;
          }
        }

        if (isResourceRemoved) {
          const path = setLabelsResourceDiff.originalResource.filename;
          const setLabelsMutator = findSetLabelsMutator(path);

          if (setLabelsMutator) {
            const anotherSetLabelsResource = currentResources.find(
              resource =>
                resource.filename === path && resource.kind === 'SetLabels',
            );

            if (!anotherSetLabelsResource) {
              mutators = mutators.filter(
                mutator => mutator !== setLabelsMutator,
              );

              mutatorsUpdated = true;
            }
          }
        }
      }

      if (mutatorsUpdated) {
        kptfileYaml.pipeline = {
          ...(kptfileYaml.pipeline ?? {}),
          mutators,
        };

        const updatedKptfileYaml = dumpYaml(kptfileYaml);

        const updatedResourcesMap = updateResourceInResourcesMap(
          currentResourcesMap,
          kptfileResource,
          updatedKptfileYaml,
        );

        return updatedResourcesMap;
      }
    }
  }

  return currentResourcesMap;
};
