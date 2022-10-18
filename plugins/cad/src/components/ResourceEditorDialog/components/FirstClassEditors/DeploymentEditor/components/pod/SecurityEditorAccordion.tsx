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
import { clone } from 'lodash';
import React, { Fragment, useMemo, useRef } from 'react';
import { PodSecurityContext } from '../../../../../../../types/Pod';
import {
  getDeployableResources,
  PackageResource,
} from '../../../../../../../utils/packageRevisionResources';
import { getNumber } from '../../../../../../../utils/string';
import { Autocomplete, Checkbox } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type SecurityState = {
  serviceAccount?: string;
  securityContext?: PodSecurityContext;
};

type OnUpdate = (newValue: SecurityState) => void;

type SecurityEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: SecurityState;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

const getResourceNames = (
  packageResources: PackageResource[],
  kind: string,
): string[] => {
  const resources = getDeployableResources(packageResources, kind);

  return resources.map(configMap => configMap.name);
};

const getDescription = (securityState: SecurityState): string => {
  const statements: string[] = [];

  statements.push(
    `${securityState.serviceAccount ?? 'default'} service account`,
  );

  return statements.join(', ');
};

const getSecurityContext = (state: SecurityState): PodSecurityContext => {
  state.securityContext = state.securityContext || {};
  return state.securityContext;
};

export const SecurityEditorAccordion = ({
  id,
  state,
  value: securityState,
  onUpdate,
  packageResources,
}: SecurityEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<SecurityState>(securityState);
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const updatedSecurityState = clone(viewModel);

    onUpdate(updatedSecurityState);
  };

  const serviceAccountNames = useMemo(
    () => ['default', ...getResourceNames(packageResources, 'ServiceAccount')],
    [packageResources],
  );

  return (
    <EditorAccordion
      id={id}
      title="Security"
      description={getDescription(viewModel)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <Autocomplete
            allowArbitraryValues
            label="Service Account"
            value={viewModel.serviceAccount || 'default'}
            options={serviceAccountNames}
            onInputChange={value => {
              viewModel.serviceAccount = value || undefined;
              valueUpdated();
            }}
          />
        </div>
        <div className={classes.multiControlRow}>
          <TextField
            label="Run as User"
            variant="outlined"
            value={viewModel.securityContext?.runAsUser || ''}
            onChange={e => {
              const securityContext = getSecurityContext(viewModel);
              securityContext.runAsUser = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />
          <TextField
            label="Run as Group"
            variant="outlined"
            value={viewModel.securityContext?.runAsGroup || ''}
            onChange={e => {
              const securityContext = getSecurityContext(viewModel);
              securityContext.runAsGroup = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />
          <TextField
            label="FS Group"
            variant="outlined"
            value={viewModel.securityContext?.fsGroup || ''}
            onChange={e => {
              const securityContext = getSecurityContext(viewModel);
              securityContext.fsGroup = getNumber(e.target.value);
              valueUpdated();
            }}
            fullWidth
          />
        </div>
        <div className={classes.multiControlRow}>
          <Checkbox
            label="Container must run as a non-root user"
            checked={viewModel.securityContext?.runAsNonRoot || false}
            onChange={checked => {
              const securityContext = getSecurityContext(viewModel);
              securityContext.runAsNonRoot = checked;
              valueUpdated();
            }}
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
