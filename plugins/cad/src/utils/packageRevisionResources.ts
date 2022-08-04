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

import { diffLines } from 'diff';
import { cloneDeep, kebabCase, sum } from 'lodash';
import { KubernetesResource } from '../types/KubernetesResource';
import {
  PackageRevisionResources,
  PackageRevisionResourcesMap,
} from '../types/PackageRevisionResource';
import {
  createMultiResourceYaml,
  getResourcesFromMultiResourceYaml,
  loadYaml,
} from './yaml';

export type PackageResource = {
  id: string;
  component: string;
  kind: string;
  name: string;
  namespace?: string;
  yaml: string;
  filename: string;
  resourceIndex: number;
};

export enum ResourceDiffStatus {
  UNCHANGED = 'unchanged',
  UPDATED = 'updated',
  ADDED = 'added',
  REMOVED = 'removed',
}

export type PackageResourceDiffRemoved = {
  originalResource: PackageResource;
  currentResource?: never;
  diffStatus: ResourceDiffStatus.REMOVED;
};

export type PackageResourceDiffUpdated = {
  originalResource: PackageResource;
  currentResource: PackageResource;
  diffStatus: ResourceDiffStatus.UPDATED;
  linesAdded: number;
  linesRemoved: number;
};

export type PackageResourceDiffUnchanged = {
  originalResource: PackageResource;
  currentResource: PackageResource;
  diffStatus: ResourceDiffStatus.UNCHANGED;
};

export type PackageResourceDiffAdded = {
  originalResource?: never;
  currentResource: PackageResource;
  diffStatus: ResourceDiffStatus.ADDED;
};

export type PackageResourceDiff =
  | PackageResourceDiffAdded
  | PackageResourceDiffUnchanged
  | PackageResourceDiffUpdated
  | PackageResourceDiffRemoved;

export const getPackageRevisionResources = (
  packageRevisionResources: PackageRevisionResources[],
  packageRevisionName: string,
): PackageRevisionResources => {
  return packageRevisionResources.find(
    r => r.metadata.name === packageRevisionName,
  ) as PackageRevisionResources;
};

export const getPackageRevisionResourcesResource = (
  fullPackageName: string,
  resourcesMap: PackageRevisionResourcesMap,
): PackageRevisionResources => {
  const packageRevisionResources: PackageRevisionResources = {
    apiVersion: 'porch.kpt.dev/v1alpha1',
    kind: 'PackageRevisionResources',
    metadata: {
      name: fullPackageName,
      namespace: 'default',
    },
    spec: {
      resources: resourcesMap,
    },
  };

  return packageRevisionResources;
};

export const getPackageResourcesFromResourcesMap = (
  resourcesMap: PackageRevisionResourcesMap,
): PackageResource[] => {
  const yamlFileEntries = Object.entries(resourcesMap).filter(
    file =>
      file[0].endsWith('.yaml') ||
      file[0] === 'Kptfile' ||
      file[0].endsWith('/Kptfile'),
  );

  const resources = yamlFileEntries.map(([filename, multiResourceYaml]) => {
    const resourcesYaml = getResourcesFromMultiResourceYaml(multiResourceYaml);

    return resourcesYaml.map((resourceYaml, index) => {
      const k8sResource = loadYaml(resourceYaml) as KubernetesResource;

      const uniqueId = `${k8sResource.kind}:${
        filename ?? k8sResource.metadata.name
      }:${index}`;

      return {
        id: uniqueId,
        component: filename.substring(0, filename.lastIndexOf('/')) || 'base',
        filename: filename,
        kind: k8sResource.kind,
        name: k8sResource.metadata.name,
        namespace: k8sResource.metadata.namespace,
        yaml: resourceYaml,
        resourceIndex: index,
      };
    });
  });

  return resources.flat();
};

const getResourcesForFile = (
  resourcesMap: PackageRevisionResourcesMap,
  filename: string,
): string[] => {
  const allResources = getPackageResourcesFromResourcesMap(resourcesMap);

  return allResources.filter(f => f.filename === filename).map(r => r.yaml);
};

export const addResourceToResourcesMap = (
  resourcesMap: PackageRevisionResourcesMap,
  newResourceYaml: string,
): PackageRevisionResourcesMap => {
  const resourceYaml = loadYaml(newResourceYaml) as KubernetesResource;
  const resourceKind = resourceYaml.kind;

  const filename = `${kebabCase(resourceKind)}.yaml`;

  const fileResourcesYaml = getResourcesForFile(resourcesMap, filename);
  fileResourcesYaml.push(newResourceYaml);

  const fullYaml = createMultiResourceYaml(fileResourcesYaml);

  const updatedResourcesMap = {
    ...cloneDeep(resourcesMap),
    [filename]: fullYaml,
  };

  return updatedResourcesMap;
};

export const updateResourceInResourcesMap = (
  resourcesMap: PackageRevisionResourcesMap,
  originalResource: PackageResource,
  updatedYaml: string,
): PackageRevisionResourcesMap => {
  const filename = originalResource.filename as string;

  const fileResourcesYaml = getResourcesForFile(resourcesMap, filename);
  fileResourcesYaml[originalResource.resourceIndex ?? 0] = updatedYaml;

  const fullYaml = createMultiResourceYaml(fileResourcesYaml);

  const updatedResourcesMap = {
    ...cloneDeep(resourcesMap),
    [filename]: fullYaml,
  };

  return updatedResourcesMap;
};

export const removeResourceFromResourcesMap = (
  resourcesMap: PackageRevisionResourcesMap,
  resourceToRemove: PackageResource,
): PackageRevisionResourcesMap => {
  const updatedResourcesMap = cloneDeep(resourcesMap);

  const { filename, resourceIndex } = resourceToRemove;

  const resourcesInFile = getResourcesForFile(resourcesMap, filename);

  if (resourceIndex === 0 && resourcesInFile.length === 1) {
    delete updatedResourcesMap[filename];
  } else {
    resourcesInFile.splice(resourceIndex, 1);
    updatedResourcesMap[filename] = createMultiResourceYaml(resourcesInFile);
  }

  return updatedResourcesMap;
};

export const diffPackageResource = (
  originalResource?: PackageResource,
  currentResource?: PackageResource,
): PackageResourceDiff => {
  if (!originalResource && currentResource) {
    return {
      diffStatus: ResourceDiffStatus.ADDED,
      currentResource: currentResource,
    };
  } else if (originalResource && !currentResource) {
    return {
      diffStatus: ResourceDiffStatus.REMOVED,
      originalResource,
    };
  } else if (originalResource && currentResource) {
    if (originalResource.yaml === currentResource.yaml) {
      return {
        diffStatus: ResourceDiffStatus.UNCHANGED,
        originalResource,
        currentResource,
      };
    }

    const thisDiff = diffLines(originalResource.yaml, currentResource.yaml, {
      ignoreWhitespace: true,
    });
    const linesAdded = sum(thisDiff.filter(d => !!d.added).map(d => d.count));
    const linesRemoved = sum(
      thisDiff.filter(d => !!d.removed).map(d => d.count),
    );

    return {
      diffStatus: ResourceDiffStatus.UPDATED,
      originalResource,
      currentResource,
      linesAdded,
      linesRemoved,
    };
  }

  throw new Error(
    'Invalid resource comparison, both the original and current resource are not defined',
  );
};

export const diffPackageResources = (
  originalResources: PackageResource[],
  currentResources: PackageResource[],
): PackageResourceDiff[] => {
  const diffSummary: PackageResourceDiff[] = [];

  for (const currentResource of currentResources) {
    const originalResource = originalResources.find(
      resource => resource.id === currentResource.id,
    );

    const diff = diffPackageResource(originalResource, currentResource);
    diffSummary.push(diff);
  }

  for (const originalResource of originalResources) {
    const currentResource = currentResources.find(
      resource => resource.id === originalResource.id,
    );

    if (!currentResource) {
      const diff = diffPackageResource(originalResource, currentResource);
      diffSummary.push(diff);
    }
  }

  return diffSummary;
};
