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
import { clone, startCase } from 'lodash';
import React, { Fragment, useRef } from 'react';
import {
  HTTPIngressPath,
  IngressBackend,
} from '../../../../../../types/Ingress';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../../utils/selectItem';
import { Select } from '../../../../../Controls';
import {
  EditorAccordion,
  OnAccordionChange,
} from '../../Controls/EditorAccordion';
import { useEditorStyles } from '../../styles';
import { IngressBackendPanel } from './IngressBackendPanel';

type OnUpdate = (newValue?: HTTPIngressPath) => void;

type HTTPPathRuleEditorAccordionProps = {
  expanded: boolean;
  onChange: OnAccordionChange;
  value: HTTPIngressPath;
  onUpdate: OnUpdate;
  serviceResources: PackageResource[];
};

const PATH_TYPE = ['Exact', 'Prefix', 'ImplementationSpecific'];

const pathTypeSelectItems: SelectItem[] = sortByLabel(
  PATH_TYPE.map(type => ({ label: startCase(type), value: type })),
);

export const HTTPPathRuleEditorAccordion = ({
  expanded,
  onChange,
  value: ingressPath,
  onUpdate,
  serviceResources,
}: HTTPPathRuleEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<HTTPIngressPath>(clone(ingressPath));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    onUpdate(viewModel);
  };

  viewModel.pathType = viewModel.pathType || 'Prefix';
  viewModel.path = viewModel.path ?? '/';

  const backendService = viewModel.backend?.service;
  const description = backendService
    ? `${viewModel.pathType} ${viewModel.path} → ${backendService.name}:${
        backendService.port.name || backendService.port.number
      }`
    : 'new rule';

  return (
    <EditorAccordion
      title="HTTP Path"
      description={description}
      expanded={expanded}
      onChange={onChange}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <Select
              label="Path Type"
              items={pathTypeSelectItems}
              selected={viewModel.pathType}
              onChange={value => {
                viewModel.pathType = value;
                valueUpdated();
              }}
            />

            <TextField
              label="Path"
              variant="outlined"
              value={viewModel.path}
              onChange={e => {
                viewModel.path = e.target.value || undefined;
                valueUpdated();
              }}
              fullWidth
            />
          </div>

          <IngressBackendPanel
            value={ingressPath.backend}
            serviceResources={serviceResources}
            onUpdate={backend => {
              viewModel.backend = backend as IngressBackend;
              valueUpdated();
            }}
          />

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
