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
import React, { Fragment, useMemo, useRef } from 'react';
import { Volume, VolumeMount } from '../../../../../../../types/Pod';
import {
  buildSelectItemsFromList,
  sortByLabel,
} from '../../../../../../../utils/selectItem';
import { Checkbox, Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (volumeMount?: VolumeMount) => void;

type VolumeMountEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: VolumeMount;
  onUpdate: OnUpdate;
  volumes: Volume[];
};

const getDescription = (volumeMount: VolumeMount): string => {
  if (!volumeMount.name) {
    return 'new volume mount';
  }

  const mountPrefix = volumeMount.readOnly ? 'readonly ' : '';

  return `${volumeMount.name} -> ${mountPrefix}${volumeMount.mountPath}`;
};

export const VolumeMountEditorAccordion = ({
  id,
  state,
  value: volumeMount,
  onUpdate,
  volumes,
}: VolumeMountEditorAccordionProps) => {
  const refViewModel = useRef<VolumeMount>(clone(volumeMount));
  const viewModel = refViewModel.current;

  const classes = useEditorStyles();

  const valueUpdated = (): void => {
    const updatedContainer = clone(viewModel);
    onUpdate(updatedContainer);
  };

  const volumeSelectItems = useMemo(
    () =>
      sortByLabel(
        buildSelectItemsFromList(
          volumes.map(volume => volume.name),
          { labelFn: false },
        ),
      ),
    [volumes],
  );

  return (
    <EditorAccordion
      id={id}
      title="Volume Mount"
      description={getDescription(volumeMount)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <Select
              label="Name"
              items={volumeSelectItems}
              selected={viewModel.name}
              onChange={volumeName => {
                viewModel.name = volumeName;
                viewModel.mountPath =
                  viewModel.mountPath || `/${viewModel.name}`;
                valueUpdated();
              }}
            />

            <TextField
              label="Mount Path"
              variant="outlined"
              value={viewModel.mountPath}
              onChange={e => {
                viewModel.mountPath = e.target.value;
                valueUpdated();
              }}
              fullWidth
            />
          </div>

          <Checkbox
            label="Readonly volume mount"
            checked={viewModel.readOnly || false}
            onChange={isChecked => {
              viewModel.readOnly = isChecked;
              valueUpdated();
            }}
          />
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
