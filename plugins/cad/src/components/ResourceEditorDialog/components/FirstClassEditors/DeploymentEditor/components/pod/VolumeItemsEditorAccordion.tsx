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
import { KeyToPath } from '../../../../../../../types/Pod';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  updateList,
} from '../../../util/deletable';
import { VolumeItemEditorAccordion } from './VolumeItemEditorAccordion';

type OnUpdate = (newValue: KeyToPath[]) => void;

type VolumeItemsEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: KeyToPath[];
  onUpdate: OnUpdate;
  keys: string[];
};

const getDescription = (items: Deletable<KeyToPath>[]): string => {
  return `${getActiveElements(items).length} keys`;
};

export const VolumeItemsEditorAccordion = ({
  id,
  state,
  value: items,
  onUpdate,
  keys,
}: VolumeItemsEditorAccordionProps) => {
  const classes = useEditorStyles();
  const [sectionExpanded, setSectionExpanded] = useState<string>();

  const refViewModel = useRef<Deletable<KeyToPath>[]>(items ?? []);
  const keyItems = refViewModel.current;

  const valueUpdated = (): void => {
    const volumeItems = getActiveElements(refViewModel.current);

    onUpdate(volumeItems);
  };

  return (
    <EditorAccordion
      id={id}
      title="Keys"
      description={getDescription(items)}
      state={state}
    >
      <Fragment>
        <div>
          {keyItems.map(
            (keyItem, index) =>
              isActiveElement(keyItem) && (
                <VolumeItemEditorAccordion
                  key={`item-${index}`}
                  id={`item-${index}`}
                  state={[sectionExpanded, setSectionExpanded]}
                  value={keyItem}
                  onUpdate={updatedKeyItem => {
                    updateList(keyItems, updatedKeyItem, index);
                    valueUpdated();
                  }}
                  keys={keys}
                />
              ),
          )}
        </div>

        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              keyItems.push({ key: '', path: '' });
              setSectionExpanded(`item-${keyItems.length - 1}`);
            }}
          >
            Add Key
          </Button>
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
