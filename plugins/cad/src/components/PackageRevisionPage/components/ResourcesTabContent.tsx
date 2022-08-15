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
import Alert from '@material-ui/lab/Alert';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { PackageRevisionLifecycle } from '../../../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  getPackageRevision,
  getPackageRevisionTitle,
} from '../../../utils/packageRevision';
import { RevisionSummary } from '../../../utils/revisionSummary';
import { Select } from '../../Controls';
import { PackageRevisionPageMode } from '../PackageRevisionPage';
import { PackageResourcesList } from './PackageResourcesList';

type ResourcesTabContentProps = {
  packageName: string;
  resourcesMap: PackageRevisionResourcesMap;
  revisions: RevisionSummary[];
  upstreamRevision?: RevisionSummary;
  onUpdatedResourcesMap: (resourcesMap: PackageRevisionResourcesMap) => void;
  alertMessages: string[];
  mode: PackageRevisionPageMode;
};

type DiffSelectItem = {
  value: string;
  label: string;
  resourcesMap: PackageRevisionResourcesMap;
};

const useStyles = makeStyles({
  alert: {
    marginBottom: '16px',
  },
});

const HIDE_COMPARISON_SELECT_ITEM: DiffSelectItem = {
  label: 'Hide comparison',
  value: 'none',
  resourcesMap: {},
};

export const ResourcesTabContent = ({
  packageName,
  resourcesMap,
  revisions,
  upstreamRevision,
  onUpdatedResourcesMap,
  alertMessages,
  mode,
}: ResourcesTabContentProps) => {
  const classes = useStyles();

  const [selectDiffItems, setSelectDiffItems] = useState<DiffSelectItem[]>([
    HIDE_COMPARISON_SELECT_ITEM,
  ]);
  const [diffSelection, setDiffSelection] = useState<DiffSelectItem>(
    HIDE_COMPARISON_SELECT_ITEM,
  );
  const [baseResourcesMap, setBaseResourcesMap] =
    useState<PackageRevisionResourcesMap>();

  const lastPackageRevisionNameDiffSet = useRef<string>('');

  useEffect(() => {
    const packageRevisions = revisions.map(r => r.revision);
    const packageRevision = getPackageRevision(packageRevisions, packageName);

    const getDiffSelectItems = (): DiffSelectItem[] => {
      const mapPreviousToSelectItem = (
        revisionSummary: RevisionSummary,
      ): DiffSelectItem => ({
        label: `Previous Revision (${revisionSummary.revision.spec.revision})`,
        value: revisionSummary.revision.metadata.name,
        resourcesMap: revisionSummary.resourcesMap,
      });

      const mapUpstreamToSelectItem = (
        revisionSummary: RevisionSummary,
      ): DiffSelectItem => ({
        label: `Upstream (${getPackageRevisionTitle(
          revisionSummary.revision,
        )})`,
        value: revisionSummary.revision.metadata.name,
        resourcesMap: revisionSummary.resourcesMap,
      });

      const currentRevisionIdx = packageRevisions.indexOf(packageRevision);

      const previousRevisions = revisions.slice(currentRevisionIdx + 1);
      const upstreamRevisions = upstreamRevision ? [upstreamRevision] : [];

      const diffItems: DiffSelectItem[] = [
        HIDE_COMPARISON_SELECT_ITEM,
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
      setDiffSelection(HIDE_COMPARISON_SELECT_ITEM);
    } else {
      const updateDiffSelection =
        packageRevision.metadata.name !==
        lastPackageRevisionNameDiffSet.current;

      if (updateDiffSelection) {
        setDiffSelection(diffItems[1] ?? HIDE_COMPARISON_SELECT_ITEM);
        lastPackageRevisionNameDiffSet.current = packageRevision.metadata.name;
      }
    }
  }, [packageName, revisions, upstreamRevision]);

  useEffect(() => {
    if (!diffSelection || diffSelection === HIDE_COMPARISON_SELECT_ITEM) {
      setBaseResourcesMap(undefined);
    } else {
      setBaseResourcesMap(diffSelection.resourcesMap);
    }
  }, [diffSelection]);

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
      <Select
        label="Compare Revision"
        onChange={value =>
          setDiffSelection(
            selectDiffItems.find(
              selectItem => selectItem.value === value,
            ) as DiffSelectItem,
          )
        }
        selected={diffSelection.value}
        items={selectDiffItems}
        helperText="Compare revision to a previous revision or upstream blueprint."
      />
    </Fragment>
  );
};
