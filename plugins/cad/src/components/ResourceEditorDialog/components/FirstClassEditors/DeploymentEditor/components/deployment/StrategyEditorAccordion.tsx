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
import { TextField } from '@material-ui/core';
import { clone, startCase } from 'lodash';
import React, { Fragment, useRef, useState } from 'react';
import { DeploymentStrategy } from '../../../../../../../types/Deployment';
import { buildSelectItemsFromList } from '../../../../../../../utils/selectItem';
import {
  getNumber,
  getNumberOrString,
  toLowerCase,
} from '../../../../../../../utils/string';
import { Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type StrategyState = {
  strategy?: DeploymentStrategy;
  minReadySeconds?: number;
  progressDeadlineSeconds?: number;
  revisionHistoryLimit?: number;
};

type OnUpdate = (newValue: StrategyState) => void;

type StrategyEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: StrategyState;
  onUpdate: OnUpdate;
};

const STRATEGY = ['Recreate', 'RollingUpdate'];

const strategySelectItems: SelectItem[] = buildSelectItemsFromList(STRATEGY);

const getStrategyType = (deploymentStrategy?: DeploymentStrategy): string => {
  return deploymentStrategy?.type || 'RollingUpdate';
};

const normalizeStrategy = (
  strategyState: StrategyState,
  strategyType: string,
): StrategyState => {
  const deploymentStrategy = strategyState.strategy || {};

  deploymentStrategy.type = strategyType;

  if (deploymentStrategy.rollingUpdate) {
    if (Object.keys(deploymentStrategy.rollingUpdate).length === 0) {
      deploymentStrategy.rollingUpdate = undefined;
    }

    if (strategyType !== 'RollingUpdate') {
      deploymentStrategy.rollingUpdate = undefined;
    }
  }

  return strategyState;
};

const getDescription = (
  strategyState: StrategyState,
  strategyType: string,
): string => {
  const statements: string[] = [];

  statements.push(startCase(strategyType));

  const deploymentStrategy = strategyState.strategy || {};
  if (strategyType === 'RollingUpdate') {
    if (deploymentStrategy.rollingUpdate?.maxUnavailable) {
      statements.push(
        `${deploymentStrategy.rollingUpdate?.maxUnavailable} max unavailable`,
      );
    }
    if (deploymentStrategy.rollingUpdate?.maxSurge) {
      statements.push(
        `${deploymentStrategy.rollingUpdate?.maxSurge} max surge`,
      );
    }
  }

  return toLowerCase(statements.join(', '));
};

const getDeploymentStrategy = (
  strategyState: StrategyState,
): DeploymentStrategy => {
  strategyState.strategy = strategyState.strategy || {};
  return strategyState.strategy;
};

export const StrategyEditorAccordion = ({
  id,
  state,
  value: strategyState,
  onUpdate,
}: StrategyEditorAccordionProps) => {
  const classes = useEditorStyles();

  const [strategyType, setStrategyType] = useState<string>(
    getStrategyType(strategyState.strategy),
  );

  const refViewModel = useRef<StrategyState>(strategyState);
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedProbe = normalizeStrategy(clone(viewModel), strategyType);

    onUpdate(updatedProbe);
  };

  return (
    <EditorAccordion
      id={id}
      title="Updates"
      description={getDescription(viewModel, strategyType)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <Select
            label="Update Strategy"
            items={strategySelectItems}
            selected={strategyType}
            onChange={value => {
              setStrategyType(value);
              valueUpdated();
            }}
          />

          {strategyType === 'RollingUpdate' && (
            <Fragment>
              <TextField
                label="Max Unavailable"
                variant="outlined"
                value={viewModel.strategy?.rollingUpdate?.maxUnavailable || ''}
                onChange={e => {
                  const strategy = getDeploymentStrategy(viewModel);
                  strategy.rollingUpdate = strategy.rollingUpdate || {};
                  strategy.rollingUpdate.maxUnavailable = getNumberOrString(
                    e.target.value,
                  );
                  valueUpdated();
                }}
                fullWidth
              />

              <TextField
                label="Max Surge"
                variant="outlined"
                value={viewModel.strategy?.rollingUpdate?.maxSurge || ''}
                onChange={e => {
                  const strategy = getDeploymentStrategy(viewModel);
                  strategy.rollingUpdate = strategy.rollingUpdate || {};
                  strategy.rollingUpdate.maxSurge = getNumberOrString(
                    e.target.value,
                  );
                  valueUpdated();
                }}
                fullWidth
              />
            </Fragment>
          )}
        </div>

        <div className={classes.multiControlRow}>
          <TextField
            label="Min Ready Seconds"
            variant="outlined"
            value={viewModel.minReadySeconds || ''}
            onChange={e => {
              viewModel.minReadySeconds = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />

          <TextField
            label="Progress Deadline Seconds"
            variant="outlined"
            value={viewModel.progressDeadlineSeconds || ''}
            onChange={e => {
              viewModel.progressDeadlineSeconds = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />

          <TextField
            label="Revision History Limit"
            variant="outlined"
            value={viewModel.revisionHistoryLimit || ''}
            onChange={e => {
              viewModel.revisionHistoryLimit = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
