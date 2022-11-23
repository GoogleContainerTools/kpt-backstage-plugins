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

import { makeStyles } from '@material-ui/core';
import { cloneDeep, uniq } from 'lodash';
import React, { Fragment } from 'react';
import { KubernetesResource } from '../../../types/KubernetesResource';
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
import { dumpYaml, loadYaml } from '../../../utils/yaml';
import { PackageRevisionPageMode } from '../PackageRevisionPage';
import {
  PackageRevisionResourcesTable,
  ResourcesTableMode,
} from './PackageRevisionResourcesTable';

type PackageResourcesListProps = {
  resourcesMap: PackageRevisionResourcesMap;
  baseResourcesMap?: PackageRevisionResourcesMap;
  onUpdatedResourcesMap: (resourcesMap: PackageRevisionResourcesMap) => void;
  resourceFilter: PackageResourceFilter;
  mode: PackageRevisionPageMode;
};

export type ResourceRow = PackageResource & {
  diffSummary: string;
  isDeleted: boolean;
  originalResource?: PackageResource;
  currentResource?: PackageResource;
};

export type PackageResourceFilter = (
  packageResource: PackageResource,
) => boolean;

const sortResources = (allResources: ResourceRow[]): void => {
  allResources.sort((resource1, resource2) => {
    const resourceScore = (resource: ResourceRow): number => {
      if (resource.kind === 'Kptfile') return 1000;
      if (resource.isLocalConfigResource) return 100;

      return 0;
    };

    const resourceComponent = (resource: ResourceRow): string => {
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

const useStyles = makeStyles({
  alert: {
    marginBottom: '24px',
  },
});

export const PackageResourcesList = ({
  resourcesMap,
  baseResourcesMap,
  onUpdatedResourcesMap,
  resourceFilter,
  mode,
}: PackageResourcesListProps) => {
  const classes = useStyles();

  const getPackageResources = (
    map: PackageRevisionResourcesMap,
  ): PackageResource[] =>
    getPackageResourcesFromResourcesMap(map).filter(resourceFilter);

  const packageResources = getPackageResources(resourcesMap) as ResourceRow[];

  const allResources: ResourceRow[] = packageResources.map(resource => ({
    ...resource,
    currentResource: resource,
  }));

  sortResources(allResources);

  if (baseResourcesMap) {
    const baseResources = getPackageResources(baseResourcesMap);

    addDiffDetails(allResources, baseResources);
  }

  const onUpdatedResource = (
    originalResource?: PackageResource,
    resource?: PackageResource,
  ): void => {
    let updatedResourcesMap = cloneDeep(resourcesMap);

    if (resource) {
      const resourceYaml = loadYaml(resource.yaml) as KubernetesResource;

      if (resourceYaml.metadata.annotations) {
        const PATH_ANNOTATION = 'internal.config.kubernetes.io/path';

        const newFilename =
          resourceYaml.metadata.annotations?.[PATH_ANNOTATION];

        if (newFilename) {
          if (!newFilename.endsWith('.yaml')) {
            throw new Error('Filename must must have the .yaml extension');
          }

          resource.filename = newFilename;

          delete resourceYaml.metadata.annotations?.[PATH_ANNOTATION];
          if (Object.keys(resourceYaml.metadata.annotations).length === 0) {
            delete resourceYaml.metadata.annotations;
          }

          resource.yaml = dumpYaml(resourceYaml);
        }
      }
    }

    const deleteResource =
      originalResource &&
      (!resource || resource.filename !== originalResource.filename);
    const updateResource =
      originalResource &&
      resource &&
      resource.filename === originalResource.filename;
    const addResource =
      resource &&
      (!originalResource || resource.filename !== originalResource?.filename);

    if (!(deleteResource || updateResource || addResource)) {
      throw new Error('No action is set to occur on resources map');
    }

    if (deleteResource) {
      updatedResourcesMap = removeResourceFromResourcesMap(
        updatedResourcesMap,
        originalResource,
      );
    }

    if (updateResource) {
      updatedResourcesMap = updateResourceInResourcesMap(
        updatedResourcesMap,
        originalResource,
        resource.yaml,
      );
    }

    if (addResource) {
      updatedResourcesMap = addResourceToResourcesMap(
        updatedResourcesMap,
        resource,
      );
    }

    onUpdatedResourcesMap(updatedResourcesMap);
  };

  const uniqueComponents = uniq(
    allResources.map(resource => resource.component),
  );

  const resourcesTableMode =
    mode === PackageRevisionPageMode.EDIT
      ? ResourcesTableMode.EDIT
      : ResourcesTableMode.VIEW;

  return (
    <Fragment>
      {uniqueComponents.map(component => (
        <div key={component} className={classes.alert}>
          <PackageRevisionResourcesTable
            title={`${component || 'root'} resources`}
            allResources={allResources}
            component={component}
            mode={resourcesTableMode}
            showDiff={!!baseResourcesMap}
            onUpdatedResource={onUpdatedResource}
          />
        </div>
      ))}
    </Fragment>
  );
};
