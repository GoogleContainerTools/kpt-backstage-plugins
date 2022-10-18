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
import { Volume } from '../../../../../../../types/Pod';
import { PackageResource } from '../../../../../../../utils/packageRevisionResources';
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
import { VolumeEditorAccordion } from './VolumeEditorAccordion';

type StorageState = {
  volumes?: Volume[];
};

type OnUpdate = (newValue: StorageState) => void;

type StorageEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: StorageState;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

const getDescription = (storageState: StorageState): string => {
  const volumeCount = storageState.volumes?.length || 0;

  return `${volumeCount} ${volumeCount === 1 ? 'volume' : 'volumes'}`;
};

export const StorageEditorAccordion = ({
  id,
  state,
  value: storageState,
  onUpdate,
  packageResources,
}: StorageEditorAccordionProps) => {
  const classes = useEditorStyles();
  const [sectionExpanded, setSectionExpanded] = useState<string>();

  const refVolumes = useRef<Deletable<Volume>[]>(storageState.volumes ?? []);
  const volumes = refVolumes.current;

  const valueUpdated = (): void => {
    const updatedStorageState: StorageState = {
      volumes: undefinedIfEmpty(getActiveElements(refVolumes.current)),
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
          {volumes.map(
            (volume, index) =>
              isActiveElement(volume) && (
                <VolumeEditorAccordion
                  key={`volume-${index}`}
                  id={`volume-${index}`}
                  state={[sectionExpanded, setSectionExpanded]}
                  value={volume}
                  onUpdate={updatedVolume => {
                    updateList(volumes, updatedVolume, index);
                    valueUpdated();
                  }}
                  packageResources={packageResources}
                />
              ),
          )}
        </div>

        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              volumes.push({ name: 'volume', emptyDir: {} });
              setSectionExpanded(`volume-${volumes.length - 1}`);
              valueUpdated();
            }}
          >
            Add Volume
          </Button>
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
