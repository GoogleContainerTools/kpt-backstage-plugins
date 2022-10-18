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
import { clone } from 'lodash';
import React, { Fragment, useMemo, useRef } from 'react';
import { ConfigMap } from '../../../../../../../types/ConfigMap';
import {
  ConfigMapKeySelector,
  EnvVar,
  ObjectFieldSelector,
  ResourceFieldSelector,
  SecretKeySelector,
} from '../../../../../../../types/Pod';
import { Secret } from '../../../../../../../types/Secret';
import {
  getDeployableResources,
  PackageResource,
} from '../../../../../../../utils/packageRevisionResources';
import { buildSelectItemsFromList } from '../../../../../../../utils/selectItem';
import { loadYaml } from '../../../../../../../utils/yaml';
import { Autocomplete, Checkbox, Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (current?: EnvVar) => void;

type ContainerPortEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: EnvVar;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

const SOURCE = [
  'config map',
  'inline',
  'pod field',
  'resource field',
  'secret',
];

const sourceSelectItems: SelectItem[] = buildSelectItemsFromList(SOURCE);

const getResourceNames = (
  packageResources: PackageResource[],
  kind: string,
): string[] => {
  const resources = getDeployableResources(packageResources, kind);

  return resources.map(configMap => configMap.name);
};

const getConfigMapKeys = (
  packageResources: PackageResource[],
  name: string,
): string[] => {
  const configMapResource = getDeployableResources(
    packageResources,
    'ConfigMap',
  ).find(resource => resource.name === name);

  if (configMapResource) {
    const configMap: ConfigMap = loadYaml(configMapResource.yaml);

    return Object.keys(configMap.data);
  }

  return [];
};

const getSecretKeys = (
  packageResources: PackageResource[],
  name: string,
): string[] => {
  const secretResource = getDeployableResources(
    packageResources,
    'Secret',
  ).find(resource => resource.name === name);

  if (secretResource) {
    const secret: Secret = loadYaml(secretResource.yaml);

    return Object.keys(secret.data);
  }

  return [];
};

const getEnvVarSource = (envVar: EnvVar): string => {
  if (envVar.valueFrom?.configMapKeyRef) return 'config map';
  if (envVar.valueFrom?.fieldRef) return 'pod field';
  if (envVar.valueFrom?.resourceFieldRef) return 'resource field';
  if (envVar.valueFrom?.secretKeyRef) return 'secret';

  return 'inline';
};

const normalizeEnvVar = (envVar: EnvVar, source: string): EnvVar => {
  if (source === 'inline') {
    envVar.valueFrom = undefined;
  }
  if (source !== 'inline') {
    envVar.value = undefined;
  }
  if (source !== 'config map' && envVar.valueFrom) {
    envVar.valueFrom.configMapKeyRef = undefined;
  }
  if (source !== 'pod field' && envVar.valueFrom) {
    envVar.valueFrom.fieldRef = undefined;
  }
  if (source !== 'resource field' && envVar.valueFrom) {
    envVar.valueFrom.resourceFieldRef = undefined;
  }
  if (source !== 'secret' && envVar.valueFrom) {
    envVar.valueFrom.secretKeyRef = undefined;
  }

  return envVar;
};

const getDescription = (envVar: EnvVar): string => {
  if (envVar.name) {
    const isOptional =
      !!envVar?.valueFrom?.configMapKeyRef?.optional ||
      !!envVar?.valueFrom?.secretKeyRef?.optional;

    return `${isOptional ? 'optional ' : ''}${envVar.name}`;
  }

  return 'new';
};

const getConfigMapKeyRef = (envVar: EnvVar): ConfigMapKeySelector => {
  envVar.valueFrom = envVar.valueFrom || {};
  envVar.valueFrom.configMapKeyRef = envVar.valueFrom.configMapKeyRef || {
    name: '',
    key: '',
  };

  return envVar.valueFrom.configMapKeyRef;
};

const getFieldRef = (envVar: EnvVar): ObjectFieldSelector => {
  envVar.valueFrom = envVar.valueFrom || {};
  envVar.valueFrom.fieldRef = envVar.valueFrom.fieldRef || { fieldPath: '' };

  return envVar.valueFrom.fieldRef;
};

const getResourceFieldRef = (envVar: EnvVar): ResourceFieldSelector => {
  envVar.valueFrom = envVar.valueFrom || {};
  envVar.valueFrom.resourceFieldRef = envVar.valueFrom.resourceFieldRef || {
    resource: '',
  };

  return envVar.valueFrom.resourceFieldRef;
};

const getSecretKeyRef = (envVar: EnvVar): SecretKeySelector => {
  envVar.valueFrom = envVar.valueFrom || {};
  envVar.valueFrom.secretKeyRef = envVar.valueFrom.secretKeyRef || {
    name: '',
    key: '',
  };

  return envVar.valueFrom.secretKeyRef;
};

export const EnvVarEditorAccordion = ({
  id,
  state,
  value: envVar,
  onUpdate,
  packageResources,
}: ContainerPortEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<EnvVar>(clone(envVar));
  const viewModel = refViewModel.current;

  const refSource = useRef<string>(getEnvVarSource(envVar));
  const source = refSource.current;

  const valueUpdated = (): void => {
    const updatedEnvVar = normalizeEnvVar(clone(viewModel), refSource.current);
    onUpdate(updatedEnvVar);
  };

  const configMapNames = useMemo(
    () => getResourceNames(packageResources, 'ConfigMap'),
    [packageResources],
  );

  const secretNames = useMemo(
    () => getResourceNames(packageResources, 'Secret'),
    [packageResources],
  );

  const selectedConfigMap = viewModel.valueFrom?.configMapKeyRef?.name || '';
  const selectedSecret = viewModel.valueFrom?.secretKeyRef?.name || '';

  const configMapKeys = useMemo(
    () => getConfigMapKeys(packageResources, selectedConfigMap),
    [selectedConfigMap, packageResources],
  );

  const secretKeys = useMemo(
    () => getSecretKeys(packageResources, selectedSecret),
    [selectedSecret, packageResources],
  );

  return (
    <EditorAccordion
      id={id}
      title="Env Variable"
      description={getDescription(envVar)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <TextField
              label="Name"
              variant="outlined"
              value={viewModel.name}
              onChange={e => {
                viewModel.name = e.target.value;
                valueUpdated();
              }}
              fullWidth
            />

            <Select
              label="Source"
              items={sourceSelectItems}
              selected={source}
              onChange={value => {
                refSource.current = value;
                valueUpdated();
              }}
            />
          </div>

          {source === 'inline' && (
            <div className={classes.multiControlRow}>
              <TextField
                label="Value"
                variant="outlined"
                value={viewModel.value}
                onChange={e => {
                  viewModel.value = e.target.value;
                  valueUpdated();
                }}
                fullWidth
              />
            </div>
          )}

          {source === 'config map' && (
            <Fragment>
              <div className={classes.multiControlRow}>
                <Autocomplete
                  allowArbitraryValues
                  label="Config Map"
                  options={configMapNames}
                  value={viewModel.valueFrom?.configMapKeyRef?.name ?? ''}
                  onInputChange={name => {
                    const configMapKeyRef = getConfigMapKeyRef(viewModel);
                    configMapKeyRef.name = name;
                    configMapKeyRef.key = '';
                    valueUpdated();
                  }}
                />

                <Autocomplete
                  allowArbitraryValues
                  label="Key"
                  options={configMapKeys}
                  value={viewModel.valueFrom?.configMapKeyRef?.key ?? ''}
                  onInputChange={key => {
                    const configMapKeyRef = getConfigMapKeyRef(viewModel);
                    configMapKeyRef.key = key;
                    valueUpdated();
                  }}
                />
              </div>

              <div className={classes.multiControlRow}>
                <Checkbox
                  label="Optional, config map and key is not required to exist"
                  checked={!!viewModel.valueFrom?.configMapKeyRef?.optional}
                  onChange={isChecked => {
                    const configMapKeyRef = getConfigMapKeyRef(viewModel);
                    configMapKeyRef.optional = isChecked || undefined;
                    valueUpdated();
                  }}
                />
              </div>
            </Fragment>
          )}

          {source === 'pod field' && (
            <div className={classes.multiControlRow}>
              <TextField
                label="Pod Field Path"
                variant="outlined"
                value={viewModel.valueFrom?.fieldRef?.fieldPath || ''}
                onChange={e => {
                  const fieldRef = getFieldRef(viewModel);
                  fieldRef.fieldPath = e.target.value;
                  valueUpdated();
                }}
                fullWidth
              />
            </div>
          )}

          {source === 'resource field' && (
            <div className={classes.multiControlRow}>
              <TextField
                label="Resource"
                variant="outlined"
                value={viewModel.valueFrom?.resourceFieldRef?.resource || ''}
                onChange={e => {
                  const resourceFieldRef = getResourceFieldRef(viewModel);
                  resourceFieldRef.resource = e.target.value;
                  valueUpdated();
                }}
                fullWidth
              />

              <TextField
                label="Divisor"
                variant="outlined"
                value={viewModel.valueFrom?.resourceFieldRef?.divisor || ''}
                onChange={e => {
                  const resourceFieldRef = getResourceFieldRef(viewModel);
                  resourceFieldRef.divisor = e.target.value || undefined;
                  valueUpdated();
                }}
                fullWidth
              />
            </div>
          )}

          {source === 'secret' && (
            <Fragment>
              <div className={classes.multiControlRow}>
                <Autocomplete
                  allowArbitraryValues
                  label="Secret"
                  options={secretNames}
                  value={viewModel.valueFrom?.secretKeyRef?.name || ''}
                  onInputChange={name => {
                    const secretKeyRef = getSecretKeyRef(viewModel);
                    secretKeyRef.name = name;
                    valueUpdated();
                  }}
                />

                <Autocomplete
                  allowArbitraryValues
                  label="Key"
                  options={secretKeys}
                  value={viewModel.valueFrom?.secretKeyRef?.key ?? ''}
                  onInputChange={key => {
                    const secretKeyRef = getSecretKeyRef(viewModel);
                    secretKeyRef.key = key;
                    valueUpdated();
                  }}
                />
              </div>

              <div className={classes.multiControlRow}>
                <Checkbox
                  label="Optional, secret and key is not required to exist"
                  checked={!!viewModel.valueFrom?.secretKeyRef?.optional}
                  onChange={isChecked => {
                    const secretKeyRef = getSecretKeyRef(viewModel);
                    secretKeyRef.optional = isChecked || undefined;
                    valueUpdated();
                  }}
                />
              </div>
            </Fragment>
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
