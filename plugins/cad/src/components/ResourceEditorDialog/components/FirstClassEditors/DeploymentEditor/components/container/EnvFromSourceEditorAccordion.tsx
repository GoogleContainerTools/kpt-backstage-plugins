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
import { Button } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { clone } from 'lodash';
import React, { Fragment, useMemo, useRef } from 'react';
import { EnvFromSource } from '../../../../../../../types/Pod';
import {
  getDeployableResources,
  PackageResource,
} from '../../../../../../../utils/packageRevisionResources';
import { buildSelectItemsFromList } from '../../../../../../../utils/selectItem';
import { Autocomplete, Checkbox, Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (newValue?: EnvFromSource) => void;

type EnvFromSourceEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: EnvFromSource;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

const SOURCE = ['config map', 'secret'];

const sourceSelectItems: SelectItem[] = buildSelectItemsFromList(SOURCE);

const getResourceNames = (
  packageResources: PackageResource[],
  kind: string,
): string[] => {
  const resources = getDeployableResources(packageResources, kind);

  return resources.map(configMap => configMap.name);
};

const getEnvFromSourceSource = (envFrom: EnvFromSource): string => {
  if (envFrom.secretRef) {
    return 'secret';
  }

  return 'config map';
};

const normalizeEnvFrom = (
  envFrom: EnvFromSource,
  source: string,
): EnvFromSource => {
  if (source !== 'config map') {
    envFrom.configMapRef = undefined;
  }
  if (source !== 'secret') {
    envFrom.secretRef = undefined;
  }

  return envFrom;
};

const getDescription = (envFrom: EnvFromSource, source: string): string => {
  if (source === 'config map') {
    return `config map ${envFrom.configMapRef?.name}`;
  }
  if (source === 'secret') {
    return `secret ${envFrom.secretRef?.name}`;
  }

  return 'unknown';
};

export const EnvFromSourceEditorAccordion = ({
  id,
  state,
  value: envFromSource,
  onUpdate,
  packageResources,
}: EnvFromSourceEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<EnvFromSource>(envFromSource);
  const viewModel = refViewModel.current;

  const refSource = useRef<string>(getEnvFromSourceSource(envFromSource));
  const source = refSource.current;

  const valueUpdated = (): void => {
    const updatedEnvFromSource = normalizeEnvFrom(
      clone(viewModel),
      refSource.current,
    );

    onUpdate(updatedEnvFromSource);
  };

  const configMapNames = useMemo(
    () => getResourceNames(packageResources, 'ConfigMap'),
    [packageResources],
  );

  const secretNames = useMemo(
    () => getResourceNames(packageResources, 'Secret'),
    [packageResources],
  );

  return (
    <EditorAccordion
      id={id}
      title="Env From"
      description={getDescription(envFromSource, source)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <Select
              label="Source"
              items={sourceSelectItems}
              selected={source}
              onChange={value => {
                refSource.current = value;
                valueUpdated();
              }}
            />

            {source === 'config map' && (
              <Autocomplete
                allowArbitraryValues
                label="Config Map"
                options={configMapNames}
                value={viewModel.configMapRef?.name ?? ''}
                onInputChange={name => {
                  viewModel.configMapRef = viewModel.configMapRef ?? {};
                  viewModel.configMapRef.name = name;
                  valueUpdated();
                }}
              />
            )}

            {source === 'secret' && (
              <Autocomplete
                allowArbitraryValues
                label="Secret"
                options={secretNames}
                value={viewModel.secretRef?.name || ''}
                onInputChange={name => {
                  viewModel.secretRef = viewModel.secretRef ?? {};
                  viewModel.secretRef.name = name;
                  valueUpdated();
                }}
              />
            )}
          </div>

          {source === 'config map' && (
            <Checkbox
              label="Optional, config map is not required to exist"
              checked={!!viewModel.configMapRef?.optional}
              onChange={isChecked => {
                viewModel.configMapRef = viewModel.configMapRef ?? {};
                viewModel.configMapRef.optional = isChecked;
                valueUpdated();
              }}
            />
          )}

          {source === 'secret' && (
            <Checkbox
              label="Optional, secret is not required to exist"
              checked={!!viewModel.secretRef?.optional}
              onChange={isChecked => {
                viewModel.secretRef = viewModel.secretRef ?? {};
                viewModel.secretRef.optional = isChecked || undefined;
                valueUpdated();
              }}
            />
          )}
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
