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

import { Button } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import React, { Fragment, useRef, useState } from 'react';
import { Volume, VolumeMount } from '../../../../../../../types/Pod';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  undefinedIfEmpty,
  updateList,
} from '../../../util/deletable';
import { VolumeMountEditorAccordion } from './VolumeMountEditorAccordion';

type StorageState = {
  volumeMounts?: VolumeMount[];
};

type OnUpdate = (newValue: StorageState) => void;

type StorageEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: StorageState;
  onUpdate: OnUpdate;
  volumes: Volume[];
};

const getDescription = (storageState: StorageState): string => {
  const volumeCount = storageState.volumeMounts?.length || 0;

  return `${volumeCount} ${volumeCount === 1 ? 'volume' : 'volumes'} mounted`;
};

export const StorageEditorAccordion = ({
  id,
  state,
  value: storageState,
  onUpdate,
  volumes,
}: StorageEditorAccordionProps) => {
  const classes = useEditorStyles();
  const [sectionExpanded, setSectionExpanded] = useState<string>();

  const refVolumeMounts = useRef<Deletable<VolumeMount>[]>(
    storageState.volumeMounts ?? [],
  );
  const volumeMounts = refVolumeMounts.current;

  const valueUpdated = (): void => {
    const updatedStorageState: StorageState = {
      volumeMounts: undefinedIfEmpty(
        getActiveElements(refVolumeMounts.current),
      ),
    };

    onUpdate(updatedStorageState);
  };

  return (
    <EditorAccordion
      id={id}
      title="Storage"
      description={getDescription(storageState)}
      state={state}
    >
      <Fragment>
        <div>
          {volumeMounts.map(
            (volumeMount, index) =>
              isActiveElement(volumeMount) && (
                <VolumeMountEditorAccordion
                  key={`volume-${index}`}
                  id={`volume-${index}`}
                  state={[sectionExpanded, setSectionExpanded]}
                  value={volumeMount}
                  onUpdate={updatedVolumeMount => {
                    updateList(volumeMounts, updatedVolumeMount, index);
                    valueUpdated();
                  }}
                  volumes={volumes}
                />
              ),
          )}
        </div>

        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              volumeMounts.push({ name: '', mountPath: '' });
              setSectionExpanded(`volume-${volumeMounts.length - 1}`);
            }}
          >
            Add Volume Mount
          </Button>
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
