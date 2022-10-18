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
import { cloneDeep } from 'lodash';
import React, { Fragment, useRef } from 'react';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';

type CommandArgsState = {
  command?: string[];
  args?: string[];
};

type OnUpdate = (newValue: CommandArgsState) => void;

type CommandArgsEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: CommandArgsState;
  onUpdate: OnUpdate;
};

const getDescription = (state: CommandArgsState): string => {
  const statements: string[] = [];

  const args = state.args ?? [];
  const commands = state.command ?? [];

  if (commands.length > 0) {
    statements.push(`command: ${commands.join(' ')}`);
  }

  if (args.length > 0) {
    statements.push(`args: ${args.join(' ')}`);
  }

  if (statements.length === 0) {
    statements.push('none set');
  }

  return statements.join(', ');
};

export const CommandArgsEditorAccordion = ({
  id,
  state,
  value: healthState,
  onUpdate,
}: CommandArgsEditorAccordionProps) => {
  const refViewModel = useRef<CommandArgsState>(cloneDeep(healthState));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const thisHealthState = cloneDeep(refViewModel.current);
    onUpdate(thisHealthState);
  };

  return (
    <EditorAccordion
      id={id}
      title="Command / Args"
      description={getDescription(healthState)}
      state={state}
    >
      <Fragment>
        <TextField
          label="Command"
          variant="outlined"
          value={viewModel.command?.join(' ')}
          onChange={e => {
            const value = e.target.value;

            const commands = value.split(' ').map(c => c.trim());
            viewModel.command = value ? commands : undefined;

            valueUpdated();
          }}
          fullWidth
        />

        <TextField
          label="Args"
          variant="outlined"
          value={viewModel.args?.join(' ')}
          onChange={e => {
            const value = e.target.value;

            const args = value.split(' ').map(c => c.trim());
            viewModel.args = value ? args : undefined;

            valueUpdated();
          }}
          fullWidth
        />
      </Fragment>
    </EditorAccordion>
  );
};
