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
import { buildSelectItemsFromList } from '../../../../../../../utils/selectItem';
import { getNumber, toLowerCase } from '../../../../../../../utils/string';
import { Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (newValue: LifeCycleState) => void;

type LifeCycleState = {
  restartPolicy?: string;
  terminationGracePeriodSeconds?: number;
};

type LifecycleEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: LifeCycleState;
  onUpdate: OnUpdate;
};

const RESTART_POLICY = ['Always', 'OnFailure', 'Never'];

const restartPolicySelectItems: SelectItem[] =
  buildSelectItemsFromList(RESTART_POLICY);

const getDescription = (state: LifeCycleState): string => {
  const statements: string[] = [];

  if (state.restartPolicy) {
    statements.push(`${startCase(state.restartPolicy)} restart`);
  }

  if (state.terminationGracePeriodSeconds) {
    statements.push(
      `${state.terminationGracePeriodSeconds}s termination grace period`,
    );
  }

  if (statements.length === 0) {
    statements.push('default');
  }

  return toLowerCase(statements.join(', '));
};

export const LifecycleEditorAccordion = ({
  id,
  state,
  value: lifecycleState,
  onUpdate,
}: LifecycleEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<LifeCycleState>(lifecycleState);
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedLifecycleState = clone(viewModel);

    onUpdate(updatedLifecycleState);
  };

  return (
    <EditorAccordion
      id={id}
      title="Lifecycle"
      description={getDescription(viewModel)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <Select
            label="Restart Policy"
            items={restartPolicySelectItems}
            selected={viewModel.restartPolicy || ''}
            onChange={value => {
              viewModel.restartPolicy = value;
              valueUpdated();
            }}
          />

          <TextField
            label="Termination Grace Period"
            variant="outlined"
            value={viewModel.terminationGracePeriodSeconds || ''}
            onChange={e => {
              viewModel.terminationGracePeriodSeconds = getNumber(
                e.target.value,
              );
              valueUpdated();
            }}
            fullWidth
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
