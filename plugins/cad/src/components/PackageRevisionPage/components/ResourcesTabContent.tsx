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

import { Card, CardContent, makeStyles, TextField } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { PackageRevisionLifecycle } from '../../../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  getPackageRevision,
  getPackageRevisionTitle,
} from '../../../utils/packageRevision';
import { RevisionSummary } from '../../../utils/revisionSummary';
import { Select } from '../../Controls';
import { PackageRevisionPageMode } from '../PackageRevisionPage';
import {
  PackageResourceFilter,
  PackageResourcesList,
} from './PackageResourcesList';

export type AlertMessage = {
  key: string;
  message: JSX.Element;
};

type ResourcesTabContentProps = {
  packageName: string;
  resourcesMap: PackageRevisionResourcesMap;
  revisions: RevisionSummary[];
  upstreamRevision?: RevisionSummary;
  onUpdatedResourcesMap: (resourcesMap: PackageRevisionResourcesMap) => void;
  alertMessages: AlertMessage[];
  mode: PackageRevisionPageMode;
};

type DiffSelectItem = {
  value: string;
  label: string;
  resourcesMap: PackageRevisionResourcesMap;
};

type ResourceFilterSelectItem = {
  value: string;
  label: string;
  filter?: PackageResourceFilter;
};

const useStyles = makeStyles({
  root: {
    '& > *:not(:last-child)': {
      marginBottom: '16px',
    },
  },
  resourceViewOptions: {
    display: 'flex',
    gap: '16px',
  },
});

const HIDE_COMPARISON_SELECT_ITEM: DiffSelectItem = {
  label: 'Hide comparison',
  value: 'none',
  resourcesMap: {},
};

const RESOURCE_FILTER_OPTIONS: ResourceFilterSelectItem[] = [
  {
    label: 'Show all resources',
    value: 'all-resources',
  },
  {
    label: 'Show deployable resources only',
    value: 'show-deployable-resources',
    filter: r => !r.isLocalConfigResource,
  },
  {
    label: 'Show local config resources only',
    value: 'show-local-config-resources',
    filter: r => r.isLocalConfigResource,
  },
];

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
  const [searchString, setSearchString] = useState<string>('');
  const [filterSelection, setFilterSelection] = useState<string>(
    RESOURCE_FILTER_OPTIONS[0].value,
  );
  const [baseResourcesMap, setBaseResourcesMap] =
    useState<PackageRevisionResourcesMap>();

  const lastPackageRevisionNameDiffSet = useRef<string>('');

  const resourceFilter = useMemo<PackageResourceFilter>(() => {
    const filterQuery: PackageResourceFilter =
      RESOURCE_FILTER_OPTIONS.find(option => option.value === filterSelection)
        ?.filter ?? (() => true);
    const searchQuery: PackageResourceFilter =
      searchString.length > 0
        ? resource =>
            resource.yaml.toLowerCase().includes(searchString.toLowerCase())
        : () => true;

    return packageResource =>
      filterQuery(packageResource) && searchQuery(packageResource);
  }, [filterSelection, searchString]);

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
    <div className={classes.root}>
      <Fragment>
        {alertMessages.map(alertMessage => (
          <Alert severity="info" key={`alert-${alertMessage.key}`}>
            {alertMessage.message}
          </Alert>
        ))}
      </Fragment>

      <Card>
        <CardContent>
          <div className={classes.resourceViewOptions}>
            <TextField
              label="Search"
              variant="outlined"
              value={searchString}
              onChange={e => setSearchString(e.target.value)}
              fullWidth
            />

            <Select
              label="Resources Filter"
              onChange={value => setFilterSelection(value)}
              selected={filterSelection}
              items={RESOURCE_FILTER_OPTIONS}
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
            />
          </div>
        </CardContent>
      </Card>

      <PackageResourcesList
        resourcesMap={resourcesMap}
        baseResourcesMap={baseResourcesMap}
        mode={mode}
        resourceFilter={resourceFilter}
        onUpdatedResourcesMap={onUpdatedResourcesMap}
      />
    </div>
  );
};
