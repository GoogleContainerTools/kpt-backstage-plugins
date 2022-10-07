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

import { Kptfile, KptfileFunction } from '../../../types/Kptfile';
import { Namespace } from '../../../types/Namespace';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import { SetNamespace } from '../../../types/SetNamespace';
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

const createNamespaceResource = (name: string): Namespace => {
  return createResource('v1', 'Namespace', name, false);
};

const createSetNamespaceResource = (namespace: string): SetNamespace => {
  return {
    ...createResource('fn.kpt.dev/v1alpha1', 'SetNamespace', 'set-namespace'),
    namespace: namespace,
  };
};

const createSetNamespacePackageResource = (
  newPackageResources: PackageResource[],
  namespace: string,
): PackageResource => {
  const setNamespaceConfigResource = createSetNamespaceResource(namespace);

  const setNamespacePackageResource = addNewPackageResource(
    newPackageResources,
    setNamespaceConfigResource,
    'set-namespace.yaml',
  );

  return setNamespacePackageResource;
};

const deleteConfigResourceReference = (
  deletedPackageResources: PackageResource[],
  resources: PackageResource[],
  setNamespaceFn: KptfileFunction,
): void => {
  if (setNamespaceFn.configPath) {
    const configResource = findKptfileFunctionConfig(resources, setNamespaceFn);

    if (configResource && isFunctionConfigDeletable(configResource)) {
      deletedPackageResources.push(configResource);
    }
  }
};

export type NamespaceState = {
  setNamespace: boolean;
  createNamespace: boolean;
  namespaceOption: string;
  namespace: string;
  advancedConfiguration: boolean;
};

export const getNamespaceDefaultState = (): NamespaceState => ({
  setNamespace: true,
  createNamespace: false,
  namespaceOption: 'user-defined',
  namespace: '',
  advancedConfiguration: false,
});

export const getNamespaceState = (
  kptfile: Kptfile,
  resources: PackageResource[],
): NamespaceState => {
  const setNamespaceFn = findKptfileFunction(
    kptfile.pipeline?.mutators || [],
    'set-namespace',
  );

  const setNamespace = !!setNamespaceFn;
  let advancedConfiguration = false;
  let namespaceOption = '';
  let namespace = '';
  if (setNamespace) {
    namespaceOption =
      setNamespaceFn.configPath === 'package-context.yaml'
        ? 'deployment'
        : 'user-defined';

    if (namespaceOption === 'user-defined') {
      const setNamespaceConfig = findKptfileFunctionConfig(
        resources,
        setNamespaceFn,
      );

      if (setNamespaceConfig && setNamespaceConfig.kind === 'SetNamespace') {
        const namespaceYaml: SetNamespace = loadYaml(setNamespaceConfig.yaml);
        namespace = namespaceYaml.namespace;
      }

      if (namespace === '') {
        advancedConfiguration = true;
      }
    }
  }

  return {
    setNamespace,
    namespaceOption,
    namespace,
    createNamespace: false,
    advancedConfiguration,
  };
};

export const applyNamespaceState = async (
  state: NamespaceState,
  resourcesMap: PackageRevisionResourcesMap,
  kptFunctions: GroupFunctionsByName,
): Promise<PackageRevisionResourcesMap> => {
  if (state.advancedConfiguration) return resourcesMap;

  const resources = getPackageResourcesFromResourcesMap(resourcesMap);
  const kptfileResource = getRootKptfile(resources);
  const kptfile = loadYaml(kptfileResource.yaml) as Kptfile;
  kptfile.pipeline = kptfile.pipeline || {};
  kptfile.pipeline.mutators = kptfile.pipeline.mutators || [];
  const mutators = kptfile.pipeline.mutators;

  const newPackageResources: PackageResource[] = [];
  const updatedPackageResources: PackageResource[] = [];
  const deletedPackageResources: PackageResource[] = [];

  const setNamespaceFn = findKptfileFunction(mutators, 'set-namespace');

  const createFnAction = state.setNamespace && !setNamespaceFn;
  const possibleUpdateFnAction = state.setNamespace && setNamespaceFn;
  const deleteFnAction = !state.setNamespace && setNamespaceFn;

  if (createFnAction) {
    const kubevalFn = getLatestFunction(kptFunctions, 'set-namespace');
    let namespaceConfigPath = 'package-context.yaml';

    if (state.namespaceOption === 'user-defined') {
      const setNamespacePackageResource = createSetNamespacePackageResource(
        newPackageResources,
        state.namespace,
      );

      namespaceConfigPath = setNamespacePackageResource.filename;
    }

    mutators.push({
      image: kubevalFn.spec.image,
      configPath: namespaceConfigPath,
    });

    addUpdatedPackageResource(
      updatedPackageResources,
      kptfileResource,
      kptfile,
    );

    if (state.createNamespace) {
      const namespaceResource: Namespace = createNamespaceResource(
        state.namespace,
      );

      addNewPackageResource(
        newPackageResources,
        namespaceResource,
        'namespace.yaml',
      );
    }
  } else if (deleteFnAction) {
    deleteConfigResourceReference(
      deletedPackageResources,
      resources,
      setNamespaceFn,
    );

    removeKptfileFunction(kptfile, 'mutator', setNamespaceFn);

    addUpdatedPackageResource(
      updatedPackageResources,
      kptfileResource,
      kptfile,
    );
  } else if (possibleUpdateFnAction) {
    const previousState = getNamespaceState(kptfile, resources);

    const namespaceOptionUpdated =
      previousState.namespaceOption !== state.namespaceOption;
    const specificNamespaceUpdated =
      state.namespaceOption === 'user-defined' &&
      previousState.namespace !== state.namespace;

    if (namespaceOptionUpdated) {
      if (state.namespaceOption === 'user-defined') {
        const setNamespacePackageResource = createSetNamespacePackageResource(
          newPackageResources,
          state.namespace,
        );

        setNamespaceFn.configPath = setNamespacePackageResource.filename;
      } else {
        deleteConfigResourceReference(
          deletedPackageResources,
          resources,
          setNamespaceFn,
        );

        setNamespaceFn.configPath = 'package-context.yaml';
      }

      addUpdatedPackageResource(
        updatedPackageResources,
        kptfileResource,
        kptfile,
      );
    } else if (specificNamespaceUpdated) {
      const setNamespaceResource = findKptfileFunctionConfig(
        resources,
        setNamespaceFn,
      );

      if (
        setNamespaceResource &&
        setNamespaceResource.kind === 'SetNamespace'
      ) {
        const setNamespace: SetNamespace = loadYaml(setNamespaceResource.yaml);
        setNamespace.namespace = state.namespace;

        addUpdatedPackageResource(
          updatedPackageResources,
          setNamespaceResource,
          setNamespace,
        );
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
