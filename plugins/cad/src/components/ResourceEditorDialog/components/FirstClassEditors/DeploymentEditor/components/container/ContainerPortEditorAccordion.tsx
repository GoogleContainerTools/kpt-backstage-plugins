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
import { Button, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { clone } from 'lodash';
import React, { Fragment, useRef } from 'react';
import { ContainerPort } from '../../../../../../../types/Pod';
import { buildSelectItemsFromList } from '../../../../../../../utils/selectItem';
import { getNumber, toLowerCase } from '../../../../../../../utils/string';
import { Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (containerPort?: ContainerPort) => void;

type ContainerPortEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: ContainerPort;
  onUpdate: OnUpdate;
};

const PORT_PROTOCOLS = ['SCTP', 'TCP', 'UDP'];

const portProtocolSelectItems: SelectItem[] =
  buildSelectItemsFromList(PORT_PROTOCOLS);

const getDescription = (containerPort: ContainerPort): string => {
  const portName = containerPort.name || '';
  const protocol = containerPort.protocol || 'TCP';
  const cPort = containerPort.containerPort ?? '';

  return toLowerCase(`${portName} ${protocol} ${cPort}`);
};

export const ContainerPortEditorAccordion = ({
  id,
  state,
  value: containerPort,
  onUpdate,
}: ContainerPortEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<ContainerPort>(clone(containerPort));
  const viewModel = refViewModel.current;

  viewModel.protocol = viewModel.protocol || 'TCP';

  const valueUpdated = (): void => {
    const updatedContainer = clone(viewModel);

    onUpdate(updatedContainer);
  };

  return (
    <EditorAccordion
      id={id}
      title="Container Port"
      description={getDescription(containerPort)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <TextField
              label="Name"
              variant="outlined"
              value={viewModel.name}
              onChange={e => {
                viewModel.name = e.target.value;
                valueUpdated();
              }}
              fullWidth
            />

            <Select
              label="Protocol"
              items={portProtocolSelectItems}
              selected={viewModel.protocol}
              onChange={value => {
                viewModel.protocol = value;
                valueUpdated();
              }}
            />

            <TextField
              label="Container Port"
              variant="outlined"
              value={viewModel.containerPort}
              onChange={e => {
                viewModel.containerPort = getNumber(e.target.value) || 0;
                valueUpdated();
              }}
              fullWidth
            />
          </div>
        </Fragment>
        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => onUpdate(undefined)}
        >
          Delete
        </Button>
      </Fragment>
    </EditorAccordion>
  );
};
