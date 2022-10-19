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
import React, { Fragment, useRef } from 'react';
import { StatefulSetUpdateStrategy } from '../../../../../../../types/StatefulSet';
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

type UpdateStrategyState = {
  updateStrategy?: StatefulSetUpdateStrategy;
  podManagementPolicy?: string;
  minReadySeconds?: number;
  revisionHistoryLimit?: number;
};

type OnUpdate = (newValue: UpdateStrategyState) => void;

type UpdateStrategyEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: UpdateStrategyState;
  onUpdate: OnUpdate;
};

const STRATEGY = ['OnDelete', 'RollingUpdate'];
const POD_MANAGEMENT_POLICY = ['OrderedReady', 'Parallel'];

const strategySelectItems: SelectItem[] = buildSelectItemsFromList(STRATEGY);
const podManagementPolicySelectItems: SelectItem[] = buildSelectItemsFromList(
  POD_MANAGEMENT_POLICY,
);

const normalizeStrategy = (
  strategyState: UpdateStrategyState,
): UpdateStrategyState => {
  const updateStrategy = strategyState.updateStrategy || {};

  if (updateStrategy.rollingUpdate) {
    if (
      Object.entries(updateStrategy.rollingUpdate).filter(
        ([_, value]) => !!value,
      ).length === 0
    ) {
      updateStrategy.rollingUpdate = undefined;
    }

    if (updateStrategy.type !== 'RollingUpdate') {
      updateStrategy.rollingUpdate = undefined;
    }
  }

  return strategyState;
};

const getDescription = (strategyState: UpdateStrategyState): string => {
  const statements: string[] = [];

  const updateStrategy = strategyState.updateStrategy;

  if (updateStrategy) {
    const strategyType = updateStrategy.type || '';

    if (strategyType) {
      statements.push(startCase(strategyType));
    }

    if (strategyType === 'RollingUpdate') {
      if (updateStrategy.rollingUpdate?.partition) {
        statements.push(`${updateStrategy.rollingUpdate?.partition} partition`);
      }
      if (updateStrategy.rollingUpdate?.maxUnavailable) {
        statements.push(
          `${updateStrategy.rollingUpdate?.maxUnavailable} max unavailable`,
        );
      }
    }
  }

  if (statements.length === 0) {
    statements.push(`default update strategy`);
  }

  return toLowerCase(statements.join(', '));
};

const getUpdateStrategy = (
  strategyState: UpdateStrategyState,
): StatefulSetUpdateStrategy => {
  strategyState.updateStrategy = strategyState.updateStrategy || {};
  return strategyState.updateStrategy;
};

export const UpdateStrategyEditorAccordion = ({
  id,
  state,
  value: updateStrategyState,
  onUpdate,
}: UpdateStrategyEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<UpdateStrategyState>(updateStrategyState);
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedProbe = normalizeStrategy(clone(viewModel));

    onUpdate(updatedProbe);
  };

  return (
    <EditorAccordion
      id={id}
      title="Updates"
      description={getDescription(updateStrategyState)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <Select
            label="Update Strategy"
            items={strategySelectItems}
            selected={viewModel.updateStrategy?.type || ''}
            onChange={value => {
              const strategy = getUpdateStrategy(viewModel);
              strategy.type = value;
              valueUpdated();
            }}
          />

          {(!viewModel.updateStrategy ||
            viewModel.updateStrategy?.type === 'RollingUpdate') && (
            <Fragment>
              <TextField
                label="Partition"
                variant="outlined"
                value={viewModel.updateStrategy?.rollingUpdate?.partition || ''}
                onChange={e => {
                  const strategy = getUpdateStrategy(viewModel);
                  strategy.rollingUpdate = strategy.rollingUpdate || {};
                  strategy.rollingUpdate.partition = getNumber(e.target.value);
                  valueUpdated();
                }}
                fullWidth
              />

              <TextField
                label="Max Unavailable"
                variant="outlined"
                value={
                  viewModel.updateStrategy?.rollingUpdate?.maxUnavailable || ''
                }
                onChange={e => {
                  const strategy = getUpdateStrategy(viewModel);
                  strategy.rollingUpdate = strategy.rollingUpdate || {};
                  strategy.rollingUpdate.maxUnavailable = getNumberOrString(
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
          <Select
            label="Pod Management Policy"
            items={podManagementPolicySelectItems}
            selected={viewModel.podManagementPolicy || ''}
            onChange={value => {
              viewModel.podManagementPolicy = value;
              valueUpdated();
            }}
          />

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
