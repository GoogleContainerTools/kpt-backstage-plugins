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
import React, { Fragment, useRef } from 'react';
import { SecurityContext } from '../../../../../../../types/Pod';
import { getNumber } from '../../../../../../../utils/string';
import { Checkbox } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type SecurityState = {
  securityContext?: SecurityContext;
};

type OnUpdate = (newValue: SecurityState) => void;

type SecurityEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: SecurityState;
  onUpdate: OnUpdate;
};

const normalizeSecurityState = (
  securityState: SecurityState,
): SecurityState => {
  const securityContext = securityState.securityContext;

  if (securityContext?.capabilities) {
    if (Object.keys(securityContext.capabilities).length === 0) {
      securityContext.capabilities = undefined;
    }
  }

  return securityState;
};

const getDescription = (securityState: SecurityState): string => {
  if (securityState.securityContext) {
    return `secruity context set`;
  }

  return `secruity context not set`;
};

const getSecurityContext = (state: SecurityState): SecurityContext => {
  state.securityContext = state.securityContext || {};
  return state.securityContext;
};

export const SecurityEditorAccordion = ({
  id,
  state,
  value: securityState,
  onUpdate,
}: SecurityEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<SecurityState>(securityState);
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedSecurityState = normalizeSecurityState(clone(viewModel));

    onUpdate(updatedSecurityState);
  };

  return (
    <EditorAccordion
      id={id}
      title="Security"
      description={getDescription(viewModel)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <TextField
            label="Add Linux Capabilities"
            variant="outlined"
            value={
              viewModel.securityContext?.capabilities?.add?.join(', ') || ''
            }
            onChange={e => {
              const value = e.target.value;

              const securityContext = getSecurityContext(viewModel);
              securityContext.capabilities = securityContext.capabilities || {};
              securityContext.capabilities.add = value
                ? value.split(',').map(v => v.trim())
                : undefined;

              valueUpdated();
            }}
            fullWidth
          />
          <TextField
            label="Drop Linux Capabilities"
            variant="outlined"
            value={
              viewModel.securityContext?.capabilities?.drop?.join(', ') || ''
            }
            onChange={e => {
              const value = e.target.value;

              const securityContext = getSecurityContext(viewModel);
              securityContext.capabilities = securityContext.capabilities || {};
              securityContext.capabilities.drop = value
                ? value.split(',').map(v => v.trim())
                : undefined;

              valueUpdated();
            }}
            fullWidth
          />
        </div>
        <div className={classes.multiControlRow}>
          <TextField
            label="Run as User"
            variant="outlined"
            value={viewModel.securityContext?.runAsUser || ''}
            onChange={e => {
              const securityContext = getSecurityContext(viewModel);
              securityContext.runAsUser = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />
          <TextField
            label="Run as Group"
            variant="outlined"
            value={viewModel.securityContext?.runAsGroup || ''}
            onChange={e => {
              const securityContext = getSecurityContext(viewModel);
              securityContext.runAsGroup = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />
        </div>

        <Checkbox
          label="Container must run as a non-root user"
          checked={viewModel.securityContext?.runAsNonRoot || false}
          onChange={checked => {
            const securityContext = getSecurityContext(viewModel);
            securityContext.runAsNonRoot = checked;
            valueUpdated();
          }}
        />

        <Checkbox
          label="Container has a read-only root filesystem"
          checked={viewModel.securityContext?.readOnlyRootFilesystem || false}
          onChange={checked => {
            const securityContext = getSecurityContext(viewModel);
            securityContext.readOnlyRootFilesystem = checked;
            valueUpdated();
          }}
        />

        <Checkbox
          label="Run container in privileged mode"
          checked={viewModel.securityContext?.privileged || false}
          onChange={checked => {
            const securityContext = getSecurityContext(viewModel);
            securityContext.privileged = checked;
            valueUpdated();
          }}
        />
      </Fragment>
    </EditorAccordion>
  );
};
