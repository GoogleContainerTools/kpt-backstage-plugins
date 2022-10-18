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
import React, { Fragment, useRef, useState } from 'react';
import {
  DeploymentStrategy,
  LabelSelector,
} from '../../../../../../types/Deployment';
import { Volume } from '../../../../../../types/Pod';
import { getNumber } from '../../../../../../utils/string';
import { KeyValueEditorAccordion } from '../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';
import { useEditorStyles } from '../../styles';
import { StrategyEditorAccordion } from './deployment/StrategyEditorAccordion';

type DeploymentState = {
  replicas?: number;
  strategy?: DeploymentStrategy;
  selector: LabelSelector;
  minReadySeconds?: number;
  progressDeadlineSeconds?: number;
  revisionHistoryLimit?: number;
};

type OnUpdate = (newValue: DeploymentState) => void;

type DeploymentDetailsEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: DeploymentState;
  onUpdate: OnUpdate;
};

export type VolumeView = Volume & {
  key: number;
};

const getDescription = (deployment: DeploymentState): string => {
  return `${deployment.replicas ?? '?'} replica(s)`;
};

export const DeploymentDetailsEditorAccordion = ({
  id,
  state,
  value: deploymentState,
  onUpdate,
}: DeploymentDetailsEditorAccordionProps) => {
  const classes = useEditorStyles();

  const [sectionExpanded, setSectionExpanded] = useState<string>();
  const refViewModel = useRef<DeploymentState>(clone(deploymentState));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    onUpdate(viewModel);
  };

  return (
    <EditorAccordion
      id={id}
      title="Deployment Details"
      description={getDescription(deploymentState)}
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
          <div />
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
          <StrategyEditorAccordion
            id="strategy"
            state={[sectionExpanded, setSectionExpanded]}
            value={{
              strategy: viewModel.strategy,
              minReadySeconds: viewModel.minReadySeconds,
              progressDeadlineSeconds: viewModel.progressDeadlineSeconds,
              revisionHistoryLimit: viewModel.revisionHistoryLimit,
            }}
            onUpdate={strategy => {
              viewModel.strategy = strategy.strategy;
              viewModel.minReadySeconds = strategy.minReadySeconds;
              viewModel.progressDeadlineSeconds =
                strategy.progressDeadlineSeconds;
              viewModel.revisionHistoryLimit = strategy.revisionHistoryLimit;
              valueUpdated();
            }}
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
