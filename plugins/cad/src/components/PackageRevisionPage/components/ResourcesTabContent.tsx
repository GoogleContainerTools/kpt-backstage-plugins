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

import { SelectItem } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { makeStyles } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { configAsDataApiRef } from '../../../apis';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  getPackageRevision,
  getPackageRevisionTitle,
} from '../../../utils/packageRevision';
import { Select } from '../../Controls';
import { PackageRevisionPageMode } from '../PackageRevisionPage';
import { PackageResourcesList } from './PackageResourcesList';

type ResourcesTabContentProps = {
  packageName: string;
  resourcesMap: PackageRevisionResourcesMap;
  packageRevisions: PackageRevision[];
  upstreamPackageRevision?: PackageRevision;
  onUpdatedResourcesMap: (resourcesMap: PackageRevisionResourcesMap) => void;
  alertMessages: string[];
  mode: PackageRevisionPageMode;
};

const useStyles = makeStyles({
  alert: {
    marginBottom: '16px',
  },
});

export const ResourcesTabContent = ({
  packageName,
  resourcesMap,
  packageRevisions,
  upstreamPackageRevision,
  onUpdatedResourcesMap,
  alertMessages,
  mode,
}: ResourcesTabContentProps) => {
  const api = useApi(configAsDataApiRef);
  const classes = useStyles();

  const [selectDiffItems, setSelectDiffItems] = useState<SelectItem[]>([]);
  const [diffSelection, setDiffSelection] = useState<string>('none');
  const [baseResourcesMap, setBaseResourcesMap] =
    useState<PackageRevisionResourcesMap>();

  const lastPackageRevisionNameDiffSet = useRef<string>('');

  useEffect(() => {
    const packageRevision = getPackageRevision(packageRevisions, packageName);

    const getDiffSelectItems = (): SelectItem[] => {
      const mapPreviousToSelectItem = (
        thisPackageRevision: PackageRevision,
      ): SelectItem => ({
        label: `Previous Revision (${thisPackageRevision.spec.revision})`,
        value: thisPackageRevision.metadata.name,
      });

      const mapUpstreamToSelectItem = (
        thisPackageRevision: PackageRevision,
      ): SelectItem => ({
        label: `Upstream (${getPackageRevisionTitle(thisPackageRevision)})`,
        value: thisPackageRevision.metadata.name,
      });

      const currentRevisionIdx = packageRevisions.indexOf(packageRevision);
      const previousRevisions = packageRevisions.slice(currentRevisionIdx + 1);
      const upstreamRevisions = upstreamPackageRevision
        ? [upstreamPackageRevision]
        : [];

      const diffItems: SelectItem[] = [
        { label: 'Hide comparison', value: 'none' },
        ...previousRevisions.map(mapPreviousToSelectItem),
        ...upstreamRevisions.map(mapUpstreamToSelectItem),
      ];

      return diffItems;
    };

    const diffItems = getDiffSelectItems();
    setSelectDiffItems(diffItems);

    const isPublished =
      packageRevision.spec.lifecycle === PackageRevisionLifecycle.PUBLISHED;

    if (isPublished) {
      setDiffSelection('none');
    } else {
      const updateDiffSelection =
        packageRevision.metadata.name !==
        lastPackageRevisionNameDiffSet.current;

      if (updateDiffSelection) {
        setDiffSelection((diffItems[1]?.value as string) || 'none');
        lastPackageRevisionNameDiffSet.current = packageRevision.metadata.name;
      }
    }
  }, [packageName, packageRevisions, upstreamPackageRevision]);

  useEffect(() => {
    if (!diffSelection || diffSelection === 'none') {
      setBaseResourcesMap(undefined);
    } else {
      const setUpstream = async (): Promise<void> => {
        const upstreamResources = await api.getPackageRevisionResources(
          diffSelection,
        );
        setBaseResourcesMap(upstreamResources.spec.resources);
      };

      setUpstream();
    }
  }, [api, diffSelection]);

  return (
    <Fragment>
      <Fragment>
        {alertMessages.map((alertMessage, index) => (
          <Alert
            className={classes.alert}
            severity="info"
            key={`alert-${index}`}
          >
            {alertMessage}
          </Alert>
        ))}
      </Fragment>
      <PackageResourcesList
        resourcesMap={resourcesMap}
        baseResourcesMap={baseResourcesMap}
        mode={mode}
        onUpdatedResourcesMap={onUpdatedResourcesMap}
      />
      <br />
      <Select
        label="Compare Revision"
        onChange={value => setDiffSelection(value)}
        selected={diffSelection}
        items={selectDiffItems}
        helperText="Compare revision to a previous revision or upstream blueprint."
      />
    </Fragment>
  );
};
