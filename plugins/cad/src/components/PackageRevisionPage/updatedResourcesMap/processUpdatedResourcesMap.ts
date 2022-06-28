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
