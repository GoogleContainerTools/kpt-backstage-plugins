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

import { ConfigMap } from '../../../types/ConfigMap';
import { Kptfile } from '../../../types/Kptfile';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  findKptfileFunction,
  getLatestFunction,
  GroupFunctionsByName,
} from '../../../utils/function';
import {
  getPackageResourcesFromResourcesMap,
  getRootKptfile,
  PackageResource,
  updateResourcesMap,
} from '../../../utils/packageRevisionResources';
import { loadYaml } from '../../../utils/yaml';
import {
  findKptfileFunctionConfig,
  isFunctionConfigDeletable,
  removeKptfileFunction,
} from './kptfile';
import {
  addNewPackageResource,
  addUpdatedPackageResource,
  createResource,
} from './resource';

const createKubevalConfigResource = (): ConfigMap => ({
  ...createResource('v1', 'ConfigMap', 'kubeval-config'),
  data: {
    ignore_missing_schemas: 'true',
  },
});

export type ValidateResourcesState = {
  setKubeval: boolean;
};

export const getValidateResourcesDefaultState = (): ValidateResourcesState => ({
  setKubeval: true,
});

export const getValidateResourcesState = (
  kptfile: Kptfile,
): ValidateResourcesState => {
  const kubevalValidatorFn = findKptfileFunction(
    kptfile.pipeline?.validators || [],
    'kubeval',
  );

  const validateState: ValidateResourcesState = {
    setKubeval: !!kubevalValidatorFn,
  };

  return validateState;
};

export const applyValidateResourcesState = async (
  state: ValidateResourcesState,
  resourcesMap: PackageRevisionResourcesMap,
  kptFunctions: GroupFunctionsByName,
): Promise<PackageRevisionResourcesMap> => {
  const resources = getPackageResourcesFromResourcesMap(resourcesMap);

  const kptfileResource = getRootKptfile(resources);
  const kptfile = loadYaml(kptfileResource.yaml) as Kptfile;
  kptfile.pipeline = kptfile.pipeline || {};
  kptfile.pipeline.validators = kptfile.pipeline.validators || [];
  const validators = kptfile.pipeline.validators;

  const newPackageResources: PackageResource[] = [];
  const updatedPackageResources: PackageResource[] = [];
  const deletedPackageResources: PackageResource[] = [];

  const kubevalValidatorFn = findKptfileFunction(validators, 'kubeval');

  if (state.setKubeval) {
    if (!kubevalValidatorFn) {
      const kubevalFn = getLatestFunction(kptFunctions, 'kubeval');

      const kubevalConfigResource = createKubevalConfigResource();

      const kubevalConfigPackageResource = addNewPackageResource(
        newPackageResources,
        kubevalConfigResource,
        'kubeval-config.yaml',
      );

      validators.push({
        image: kubevalFn.spec.image,
        configPath: kubevalConfigPackageResource.filename,
      });

      addUpdatedPackageResource(
        updatedPackageResources,
        kptfileResource,
        kptfile,
      );
    }
  } else {
    if (kubevalValidatorFn) {
      removeKptfileFunction(kptfile, 'validator', kubevalValidatorFn);

      addUpdatedPackageResource(
        updatedPackageResources,
        kptfileResource,
        kptfile,
      );

      if (kubevalValidatorFn.configPath) {
        const configResource = findKptfileFunctionConfig(
          resources,
          kubevalValidatorFn,
        );

        if (configResource && isFunctionConfigDeletable(configResource)) {
          deletedPackageResources.push(configResource);
        }
      }
    }
  }

  return updateResourcesMap(
    resourcesMap,
    newPackageResources,
    updatedPackageResources,
    deletedPackageResources,
  );
};
