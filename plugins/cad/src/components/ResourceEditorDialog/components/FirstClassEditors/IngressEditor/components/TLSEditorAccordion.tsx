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
import { IngressTLS } from '../../../../../../types/Ingress';

import {
  EditorAccordion,
  OnAccordionChange,
} from '../../Controls/EditorAccordion';

type OnUpdate = (newValue?: IngressTLS) => void;

type TLSEditorAccordionProps = {
  expanded: boolean;
  onChange: OnAccordionChange;
  value: IngressTLS;
  onUpdate: OnUpdate;
};

export const TLSEditorAccordion = ({
  expanded,
  onChange,
  value: ingressTls,
  onUpdate,
}: TLSEditorAccordionProps) => {
  const refViewModel = useRef<IngressTLS>(clone(ingressTls));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    onUpdate(viewModel);
  };

  const description = `${viewModel.hosts?.join(', ') || 'new tls'}`;

  return (
    <EditorAccordion
      title="TLS"
      description={description}
      expanded={expanded}
      onChange={onChange}
    >
      <Fragment>
        <Fragment>
          <Fragment>
            <TextField
              label="Hosts"
              variant="outlined"
              value={(viewModel?.hosts ?? []).join(', ')}
              onChange={e => {
                viewModel.hosts =
                  e.target.value.split(',').map(s => s.trim()) || undefined;
                valueUpdated();
              }}
              fullWidth
            />

            <TextField
              label="Secret Name"
              variant="outlined"
              value={viewModel?.secretName ?? ''}
              onChange={e => {
                viewModel.secretName = e.target.value || undefined;
                valueUpdated();
              }}
              fullWidth
            />
          </Fragment>

          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => {
              onUpdate(undefined);
            }}
          >
            Delete
          </Button>
        </Fragment>
      </Fragment>
    </EditorAccordion>
  );
};
