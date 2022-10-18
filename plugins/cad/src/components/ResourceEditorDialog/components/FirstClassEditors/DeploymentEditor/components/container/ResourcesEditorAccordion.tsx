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
import { ResourceRequirements } from '../../../../../../../types/Pod';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (newValue: ResourceRequirements | undefined) => void;

type ResourcesEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: ResourceRequirements;
  onUpdate: OnUpdate;
};

const normalizeResources = (
  resources: ResourceRequirements,
): ResourceRequirements | undefined => {
  if (resources.requests) {
    if (!resources.requests.cpu) delete resources.requests.cpu;
    if (!resources.requests.memory) delete resources.requests.memory;

    if (Object.keys(resources.requests).length === 0) delete resources.requests;
  }

  if (resources.limits) {
    if (!resources.limits.cpu) delete resources.limits.cpu;
    if (!resources.limits.memory) delete resources.limits.memory;

    if (Object.keys(resources.limits).length === 0) delete resources.limits;
  }

  if (Object.keys(resources).length === 0) {
    return undefined;
  }

  return resources;
};

const getDescription = (resourceRequirements: ResourceRequirements): string => {
  const statements: string[] = [];

  const cpuRequest = resourceRequirements.requests?.cpu;
  const cpuLimit = resourceRequirements.limits?.cpu;

  const memoryRequest = resourceRequirements.requests?.memory;
  const memoryLimit = resourceRequirements.limits?.memory;

  if (cpuRequest || cpuLimit) {
    statements.push(`cpu ${cpuRequest || 'none'}/${cpuLimit || 'none'}`);
  }

  if (memoryRequest || memoryLimit) {
    statements.push(
      `memory ${memoryRequest || 'none'}/${memoryLimit || 'none'}`,
    );
  }

  if (statements.length === 0) {
    statements.push('no cpu or memory requests/limits set');
  }

  return statements.join(', ');
};

export const ResourcesEditorAccordion = ({
  id,
  state,
  value: resources,
  onUpdate,
}: ResourcesEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<ResourceRequirements>(resources);
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedResources = normalizeResources(clone(viewModel));

    onUpdate(updatedResources);
  };

  return (
    <EditorAccordion
      id={id}
      title="Resources"
      description={getDescription(viewModel)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <TextField
            label="CPU Request"
            variant="outlined"
            value={viewModel.requests?.cpu ?? ''}
            onChange={e => {
              viewModel.requests = viewModel.requests || {};
              viewModel.requests.cpu = e.target.value;
              valueUpdated();
            }}
            fullWidth
          />
          <TextField
            label="CPU Limit"
            variant="outlined"
            value={viewModel.limits?.cpu ?? ''}
            onChange={e => {
              viewModel.limits = viewModel.limits || {};
              viewModel.limits.cpu = e.target.value;
              valueUpdated();
            }}
            fullWidth
          />
        </div>

        <div className={classes.multiControlRow}>
          <TextField
            label="Memory Request"
            variant="outlined"
            value={viewModel.requests?.memory || ''}
            onChange={e => {
              viewModel.requests = viewModel.requests || {};
              viewModel.requests.memory = e.target.value;
              valueUpdated();
            }}
            fullWidth
          />
          <TextField
            label="Memory Limit"
            variant="outlined"
            value={viewModel.limits?.memory || ''}
            onChange={e => {
              viewModel.limits = viewModel.limits || {};
              viewModel.limits.memory = e.target.value;
              valueUpdated();
            }}
            fullWidth
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
