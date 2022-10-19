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

import { TextField } from '@material-ui/core';
import { clone } from 'lodash';
import React, { Fragment, useMemo, useRef, useState } from 'react';
import { Volume } from '../../../../../../types/Pod';
import {
  LabelSelector,
  StatefulSetUpdateStrategy,
} from '../../../../../../types/StatefulSet';
import {
  getDeployableResources,
  PackageResource,
} from '../../../../../../utils/packageRevisionResources';
import { getNumber } from '../../../../../../utils/string';
import { Autocomplete } from '../../../../../Controls';
import { KeyValueEditorAccordion } from '../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';
import { useEditorStyles } from '../../styles';
import { UpdateStrategyEditorAccordion } from './statefulSet/UpdateStrategyEditorAccordion';

type StatefulSetState = {
  replicas?: number;
  podManagementPolicy?: string;
  updateStrategy?: StatefulSetUpdateStrategy;
  selector: LabelSelector;
  minReadySeconds?: number;
  revisionHistoryLimit?: number;
  serviceName: string;
};

type OnUpdate = (newValue: StatefulSetState) => void;

type StatefulSetDetailsEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: StatefulSetState;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

export type VolumeView = Volume & {
  key: number;
};

const getResourceNames = (
  packageResources: PackageResource[],
  kind: string,
): string[] => {
  const resources = getDeployableResources(packageResources, kind);

  return resources.map(resource => resource.name);
};

const getDescription = (statefulSet: StatefulSetState): string => {
  const statements: string[] = [`${statefulSet.replicas ?? '?'} replica(s)`];

  if (statefulSet.serviceName) {
    statements.push(`${statefulSet.serviceName} service`);
  }

  return statements.join(', ');
};

export const StatefulSetDetailsEditorAccordion = ({
  id,
  state,
  value: statefulSetState,
  onUpdate,
  packageResources,
}: StatefulSetDetailsEditorAccordionProps) => {
  const classes = useEditorStyles();

  const [sectionExpanded, setSectionExpanded] = useState<string>();
  const refViewModel = useRef<StatefulSetState>(clone(statefulSetState));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    onUpdate(viewModel);
  };

  const serviceNames = useMemo(
    () => getResourceNames(packageResources, 'Service'),
    [packageResources],
  );

  return (
    <EditorAccordion
      id={id}
      title="Stateful Set Details"
      description={getDescription(statefulSetState)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <TextField
            label="Replicas"
            variant="outlined"
            value={viewModel.replicas || ''}
            onChange={e => {
              const value = e.target.value;
              viewModel.replicas = getNumber(value);
              valueUpdated();
            }}
            fullWidth
          />

          <Autocomplete
            allowArbitraryValues
            label="Service"
            value={viewModel.serviceName}
            options={serviceNames}
            onInputChange={value => {
              viewModel.serviceName = value;
              valueUpdated();
            }}
          />
        </div>

        <div>
          <KeyValueEditorAccordion
            id="label-selector"
            title="Label Selector"
            state={[sectionExpanded, setSectionExpanded]}
            keyValueObject={viewModel.selector.matchLabels || {}}
            onUpdatedKeyValueObject={labels => {
              viewModel.selector.matchLabels = labels;
              valueUpdated();
            }}
          />

          <UpdateStrategyEditorAccordion
            id="strategy"
            state={[sectionExpanded, setSectionExpanded]}
            value={viewModel}
            onUpdate={updateStrategy => {
              refViewModel.current = { ...viewModel, ...updateStrategy };
              valueUpdated();
            }}
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
