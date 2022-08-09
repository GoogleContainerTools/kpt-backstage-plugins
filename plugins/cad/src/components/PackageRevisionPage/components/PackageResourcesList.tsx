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

export const PackageResourcesList = ({
  resourcesMap,
  baseResourcesMap,
  onUpdatedResourcesMap,
  mode,
}: PackageResourcesListProps) => {
  const resourcesTableMode =
    mode === PackageRevisionPageMode.EDIT
      ? ResourcesTableMode.EDIT
      : ResourcesTableMode.VIEW;

  return (
    <Fragment>
      <PackageRevisionResourcesTable
        resourcesMap={resourcesMap}
        baseResourcesMap={baseResourcesMap}
        mode={resourcesTableMode}
        onUpdatedResourcesMap={onUpdatedResourcesMap}
      />
    </Fragment>
  );
};
