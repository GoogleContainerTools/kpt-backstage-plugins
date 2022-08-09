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

import React, { Fragment } from 'react';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  addResourceToResourcesMap,
  diffPackageResources,
  getPackageResourcesFromResourcesMap,
  PackageResource,
  removeResourceFromResourcesMap,
  ResourceDiffStatus,
  updateResourceInResourcesMap,
} from '../../../utils/packageRevisionResources';
import { PackageRevisionPageMode } from '../PackageRevisionPage';
import {
  PackageRevisionResourcesTable,
  ResourcesTableMode,
} from './PackageRevisionResourcesTable';

type PackageResourcesListProps = {
  resourcesMap: PackageRevisionResourcesMap;
  baseResourcesMap?: PackageRevisionResourcesMap;
  onUpdatedResourcesMap: (resourcesMap: PackageRevisionResourcesMap) => void;
  mode: PackageRevisionPageMode;
};

export type ResourceRow = PackageResource & {
  diffSummary: string;
  isDeleted: boolean;
  originalResource?: PackageResource;
  currentResource?: PackageResource;
};

const sortResources = (allResources: ResourceRow[]): void => {
  allResources.sort((resource1, resource2) => {
    const resourceScore = (resource: ResourceRow): number => {
      if (resource.kind === 'Kptfile') return 1000;
      if (resource.kind === 'Namespace') return 100;

      return 0;
    };

    const resourceComponent = (resource: ResourceRow): string => {
      if (resource.component === 'base') return '';

      return resource.component;
    };

    const resourceQualifiedName = (resource: ResourceRow): string =>
      (resource.namespace || ' ') + resource.kind + resource.name;

    if (resourceComponent(resource1) !== resourceComponent(resource2)) {
      return resourceComponent(resource1) > resourceComponent(resource2)
        ? 1
        : -1;
    }

    if (resourceScore(resource1) === resourceScore(resource2)) {
      return resourceQualifiedName(resource1) > resourceQualifiedName(resource2)
        ? 1
        : -1;
    }

    return resourceScore(resource1) < resourceScore(resource2) ? 1 : -1;
  });
};

const addDiffDetails = (
  allResources: ResourceRow[],
  baseResources: PackageResource[],
): void => {
  const resourcesDiff = diffPackageResources(baseResources, allResources);

  for (const resourceDiff of resourcesDiff) {
    if (resourceDiff.diffStatus === ResourceDiffStatus.REMOVED) {
      allResources.push({
        ...resourceDiff.originalResource,
        diffSummary: 'Removed',
        isDeleted: true,
        yaml: '',
        originalResource: resourceDiff.originalResource,
      });
    }

    const diffResource =
      resourceDiff.currentResource ?? resourceDiff.originalResource;
    const thisResource = allResources.find(
      resource => resource.id === diffResource.id,
    );

    if (!thisResource) {
      throw new Error(
        'Resource exists within diff, however the resource is not found in allResources',
      );
    }

    thisResource.originalResource = resourceDiff.originalResource;

    switch (resourceDiff.diffStatus) {
      case ResourceDiffStatus.ADDED:
        thisResource.diffSummary = 'Added';
        break;

      case ResourceDiffStatus.REMOVED:
        thisResource.diffSummary = 'Removed';
        break;

      case ResourceDiffStatus.UPDATED:
        thisResource.diffSummary = `Diff (+${resourceDiff.linesAdded}, -${resourceDiff.linesRemoved})`;
        break;
      case ResourceDiffStatus.UNCHANGED:
        break;

      default:
        throw new Error('Unknown diff status');
    }
  }
};

export const PackageResourcesList = ({
  resourcesMap,
  baseResourcesMap,
  onUpdatedResourcesMap,
  mode,
}: PackageResourcesListProps) => {
  const packageResources = getPackageResourcesFromResourcesMap(
    resourcesMap,
  ) as ResourceRow[];

  const allResources: ResourceRow[] = packageResources.map(resource => ({
    ...resource,
    currentResource: resource,
  }));

  sortResources(allResources);

  if (baseResourcesMap) {
    const baseResources = getPackageResourcesFromResourcesMap(baseResourcesMap);

    addDiffDetails(allResources, baseResources);
  }

  const onUpdatedResource = (
    originalResource?: PackageResource,
    resource?: PackageResource,
  ): void => {
    let updatedResourcesMap: PackageRevisionResourcesMap | undefined;

    if (originalResource && !resource) {
      updatedResourcesMap = removeResourceFromResourcesMap(
        resourcesMap,
        originalResource,
      );
    } else if (originalResource && resource) {
      updatedResourcesMap = updateResourceInResourcesMap(
        resourcesMap,
        originalResource,
        resource.yaml,
      );
    } else if (!originalResource && resource) {
      updatedResourcesMap = addResourceToResourcesMap(
        resourcesMap,
        resource.yaml,
      );
    }

    if (!updatedResourcesMap) {
      throw new Error('Resources map never updated');
    }

    onUpdatedResourcesMap(updatedResourcesMap);
  };

  const resourcesTableMode =
    mode === PackageRevisionPageMode.EDIT
      ? ResourcesTableMode.EDIT
      : ResourcesTableMode.VIEW;

  return (
    <Fragment>
      <PackageRevisionResourcesTable
        allResources={allResources}
        mode={resourcesTableMode}
        showDiff={!!baseResourcesMap}
        onUpdatedResource={onUpdatedResource}
      />
    </Fragment>
  );
};
