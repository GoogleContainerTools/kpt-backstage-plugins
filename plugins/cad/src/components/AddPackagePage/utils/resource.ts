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

import { KubernetesResource } from '../../../types/KubernetesResource';
import { PackageResource } from '../../../utils/packageRevisionResources';
import { dumpYaml } from '../../../utils/yaml';

export const createResource = (
  apiVersion: string,
  kind: string,
  name: string,
  localConfig: boolean = true,
): KubernetesResource => {
  const resource: KubernetesResource = {
    apiVersion: apiVersion,
    kind: kind,
    metadata: {
      name: name,
    },
  };

  if (localConfig) {
    resource.metadata.annotations = {
      'config.kubernetes.io/local-config': 'true',
    };
  }

  return resource;
};

export const addNewPackageResource = (
  newPackageResources: PackageResource[],
  resource: KubernetesResource,
  filename: string,
): PackageResource => {
  const packageResource: PackageResource = {
    filename: filename,
    yaml: dumpYaml(resource),
  } as PackageResource;

  newPackageResources.push(packageResource);

  return packageResource;
};

export const addUpdatedPackageResource = (
  updatedPackageResources: PackageResource[],
  packageResource: PackageResource,
  resource: KubernetesResource,
): PackageResource => {
  packageResource.yaml = dumpYaml(resource);

  updatedPackageResources.push(packageResource);

  return packageResource;
};
