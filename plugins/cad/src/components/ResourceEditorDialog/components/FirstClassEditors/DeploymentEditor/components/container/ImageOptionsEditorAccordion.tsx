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
import { toLowerCase } from '../../../../../../../utils/string';
import { Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

const IMAGE_PULL_POLICY = ['Always', 'Never', 'IfNotPresent'];

const pullPolicySelectItems: SelectItem[] =
  buildSelectItemsFromList(IMAGE_PULL_POLICY);

type OnUpdate = (imageOptions: ImageOptions) => void;

type ImageOptions = {
  imagePullPolicy?: string;
  imagePullSecrets?: string[];
};

type ImageOptionsEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: ImageOptions;
  onUpdate: OnUpdate;
};

const getDescription = (imageOptions: ImageOptions): string => {
  const statements: string[] = [];

  if (imageOptions.imagePullPolicy) {
    statements.push(`${startCase(imageOptions.imagePullPolicy)} pull image`);
  }
  if (imageOptions.imagePullSecrets) {
    statements.push(
      `${imageOptions.imagePullSecrets.length} image pull secrets`,
    );
  }

  if (statements.length === 0) {
    statements.push('no image options set');
  }

  return toLowerCase(statements.join(', '));
};

export const ImageOptionsEditorAccordion = ({
  id,
  state,
  value: imageOptions,
  onUpdate,
}: ImageOptionsEditorAccordionProps) => {
  const refViewModel = useRef<ImageOptions>(clone(imageOptions));
  const viewModel = refViewModel.current;

  const classes = useEditorStyles();

  const valueUpdated = (): void => {
    const updatedContainer = clone(viewModel);
    onUpdate(updatedContainer);
  };

  return (
    <EditorAccordion
      id={id}
      title="Image Options"
      description={getDescription(viewModel)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <Select
            label="Pull Policy"
            items={pullPolicySelectItems}
            selected={viewModel.imagePullPolicy || ''}
            onChange={value => {
              viewModel.imagePullPolicy = value || undefined;
              valueUpdated();
            }}
          />

          <TextField
            label="Pull Secrets"
            variant="outlined"
            value={viewModel.imagePullSecrets?.join(', ') ?? ''}
            onChange={e => {
              const value = e.target.value;
              viewModel.imagePullSecrets = value
                ? value.split(',').map(v => v.trim())
                : undefined;

              valueUpdated();
            }}
            fullWidth
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
