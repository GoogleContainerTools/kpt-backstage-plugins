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

export const processApplyReplacementsUpdates = async (
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

  const applyReplacementsResourceDiffs = changedResources.filter(
    resource =>
      (resource.originalResource ?? resource.currentResource).kind ===
        'ApplyReplacements' &&
      (resource.diffStatus === ResourceDiffStatus.ADDED ||
        resource.diffStatus === ResourceDiffStatus.REMOVED),
  );

  if (applyReplacementsResourceDiffs.length > 0) {
    const kptfileResource = currentResources.find(r => r.kind === 'Kptfile');

    if (kptfileResource) {
      const kptfileYaml = loadYaml(kptfileResource.yaml) as Kptfile;

      let mutatorsUpdated = false;
      let mutators = kptfileYaml.pipeline?.mutators ?? [];

      const findApplyReplacementsMutator = (
        configPath: string,
      ): KptfileFunction | undefined =>
        mutators.find(
          mutator =>
            getFunctionNameFromImage(mutator.image) === 'apply-replacements' &&
            mutator.configPath === configPath,
        );

      for (const applyReplacementsResourceDiff of applyReplacementsResourceDiffs) {
        const diffStatus = applyReplacementsResourceDiff.diffStatus;
        const isResourceAdded = diffStatus === ResourceDiffStatus.ADDED;
        const isResourceRemoved = diffStatus === ResourceDiffStatus.REMOVED;

        if (isResourceAdded) {
          const path = applyReplacementsResourceDiff.currentResource.filename;
          const applyReplacementsMutator = findApplyReplacementsMutator(path);

          if (!applyReplacementsMutator) {
            const allKptFunctions = await api.listCatalogFunctions();
            const kptFunctions = groupFunctionsByName(allKptFunctions);
            const applyReplacementsFn = kptFunctions['apply-replacements'];

            mutators.push({
              image: applyReplacementsFn[0].spec.image,
              configPath: path,
            });

            mutatorsUpdated = true;
          }
        }

        if (isResourceRemoved) {
          const path = applyReplacementsResourceDiff.originalResource.filename;
          const applyReplacementsMutator = findApplyReplacementsMutator(path);

          if (applyReplacementsMutator) {
            const anotherApplyReplacementsResource = currentResources.find(
              resource =>
                resource.filename === path &&
                resource.kind === 'ApplyReplacements',
            );

            if (!anotherApplyReplacementsResource) {
              mutators = mutators.filter(
                mutator => mutator !== applyReplacementsMutator,
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
