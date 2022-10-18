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

import { Button, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { clone } from 'lodash';
import React, { Fragment, useRef } from 'react';
import { KeyToPath } from '../../../../../../../types/Pod';
import { Autocomplete } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (keyToPath?: KeyToPath) => void;

type VolumeItemEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: KeyToPath;
  onUpdate: OnUpdate;
  keys: string[];
};

const getDescription = (keyToPath: KeyToPath): string => {
  return keyToPath.key ? `${keyToPath.key} → ${keyToPath.path}` : 'new key';
};

export const VolumeItemEditorAccordion = ({
  id,
  state,
  value: keyToPath,
  onUpdate,
  keys,
}: VolumeItemEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<KeyToPath>(clone(keyToPath));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedKeyToPath = clone(viewModel);
    onUpdate(updatedKeyToPath);
  };

  return (
    <EditorAccordion
      id={id}
      title="Key"
      description={getDescription(keyToPath)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <Autocomplete
              allowArbitraryValues
              label="Key"
              options={keys}
              value={viewModel.key ?? ''}
              onInputChange={key => {
                viewModel.key = key;
                viewModel.path = viewModel.path || key;
                valueUpdated();
              }}
            />

            <TextField
              label="Path"
              variant="outlined"
              value={viewModel.path}
              onChange={e => {
                viewModel.path = e.target.value;
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
