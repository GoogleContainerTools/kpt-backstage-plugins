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
import React, { Fragment, useRef } from 'react';
import { KptfileInfo } from '../../../../../../types/Kptfile';
import { emptyIfUndefined } from '../../../../../../utils/string';
import { EditorAccordion } from '../../Controls';
import { AccordionState } from '../../Controls/EditorAccordion';

type OnUpdate = (value: KptfileInfo) => void;

type KptfileInfoEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: KptfileInfo;
  onUpdate: OnUpdate;
};

export const KptfileInfoEditorAccordion = ({
  id,
  state,
  value: kptfileInfo,
  onUpdate,
}: KptfileInfoEditorAccordionProps) => {
  const refViewModel = useRef<KptfileInfo>(kptfileInfo);
  const viewModel = refViewModel.current;

  const description = viewModel.description || 'no description';

  const valueUpdated = (): void => {
    onUpdate(viewModel);
  };

  return (
    <EditorAccordion
      id={id}
      title="Info"
      description={description}
      state={state}
    >
      <Fragment>
        <TextField
          label="Description"
          variant="outlined"
          value={emptyIfUndefined(viewModel.description)}
          onChange={e => {
            viewModel.description = e.target.value;
            valueUpdated();
          }}
          fullWidth
        />

        <TextField
          label="Keywords"
          variant="outlined"
          value={(viewModel.keywords ?? []).join(', ')}
          onChange={e => {
            const value = e.target.value;

            viewModel.keywords = value
              ? value.split(',').map(v => v.trim())
              : undefined;
            valueUpdated();
          }}
          fullWidth
        />

        <TextField
          label="Site"
          variant="outlined"
          value={emptyIfUndefined(viewModel.site)}
          onChange={e => {
            viewModel.site = e.target.value || undefined;
            valueUpdated();
          }}
          fullWidth
        />

        <TextField
          label="Readiness Gates"
          variant="outlined"
          value={(viewModel.readinessGates ?? [])
            .map(r => r.conditionType)
            .join(', ')}
          onChange={e => {
            const value = e.target.value;

            viewModel.readinessGates = value
              ? value.split(',').map(v => ({ conditionType: v.trim() }))
              : undefined;
            valueUpdated();
          }}
          fullWidth
          multiline
        />
      </Fragment>
    </EditorAccordion>
  );
};
