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
import React, { Fragment, useMemo, useRef, useState } from 'react';
import { ConfigMap } from '../../../../../../../types/ConfigMap';
import { Volume } from '../../../../../../../types/Pod';
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
import { VolumeItemsEditorAccordion } from './VolumeItemsEditorAccordion';

type OnUpdate = (volumeMount?: Volume) => void;

type VolumeEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: Volume;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

const SOURCES = [
  'empty dir',
  'config map',
  'secret',
  'persistent volume claim',
];
const volumeSourceSelectItems: SelectItem[] = buildSelectItemsFromList(SOURCES);

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

const getVolumeSource = (volume: Volume): string => {
  if (volume.configMap) return 'config map';
  if (volume.persistentVolumeClaim) return 'persistent volume claim';
  if (volume.secret) return 'secret';

  return 'empty dir';
};

const getUseItems = (volume: Volume, source: string) => {
  if (source === 'config map' && !!volume.configMap?.items) {
    return true;
  }
  if (source === 'secret' && !!volume.secret?.items) {
    return true;
  }

  return false;
};

const normalizeVolume = (
  volume: Volume,
  source: string,
  useItems: boolean,
): Volume => {
  if (source === 'config map' && !useItems && volume.configMap) {
    volume.configMap.items = undefined;
  }
  if (source === 'secret' && !useItems && volume.secret) {
    volume.secret.items = undefined;
  }
  if (source !== 'config map') {
    volume.configMap = undefined;
  }
  if (source !== 'empty dir') {
    volume.emptyDir = undefined;
  }
  if (source !== 'persistent volume claim') {
    volume.persistentVolumeClaim = undefined;
  }
  if (source !== 'secret') {
    volume.secret = undefined;
  }

  return volume;
};

const getDescription = (volume: Volume): string => {
  return volume.name || 'new';
};

export const VolumeEditorAccordion = ({
  id,
  state,
  value: volume,
  onUpdate,
  packageResources,
}: VolumeEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<Volume>(clone(volume));
  const viewModel = refViewModel.current;

  const [sectionExpanded, setSectionExpanded] = useState<string>();

  const refSource = useRef<string>(getVolumeSource(volume));
  const refUseItems = useRef<boolean>(getUseItems(volume, refSource.current));

  const source = refSource.current;
  const useItems = refUseItems.current;

  const valueUpdated = (): void => {
    const updatedVolume = normalizeVolume(
      clone(viewModel),
      refSource.current,
      refUseItems.current,
    );
    onUpdate(updatedVolume);
  };

  const configMapNames = getResourceNames(packageResources, 'ConfigMap');
  const secretNames = getResourceNames(packageResources, 'Secret');
  const persistentVolumeClaimNames = getResourceNames(
    packageResources,
    'PersistentVolumeClaim',
  );

  const selectedConfigMap = viewModel.configMap?.name || '';
  const selectedSecret = viewModel.secret?.secretName || '';

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
      title="Volume"
      description={getDescription(volume)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <Select
              label="Source"
              items={volumeSourceSelectItems}
              selected={source}
              onChange={value => {
                refSource.current = value;
                refUseItems.current = getUseItems(viewModel, value);
                valueUpdated();
              }}
            />

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
          </div>

          {source === 'config map' && (
            <Fragment>
              <Autocomplete
                allowArbitraryValues
                label="Config Map"
                options={configMapNames}
                value={viewModel.configMap?.name ?? ''}
                onInputChange={name => {
                  viewModel.configMap = viewModel.configMap || { name: '' };
                  viewModel.configMap.name = name;
                  valueUpdated();
                }}
              />

              <Checkbox
                label="Optional, config map is not required to exist"
                checked={!!viewModel.configMap?.optional}
                onChange={isChecked => {
                  viewModel.configMap = viewModel.configMap || { name: '' };
                  viewModel.configMap.optional = isChecked || undefined;
                  valueUpdated();
                }}
              />

              <Checkbox
                label="Specify keys to map from config map"
                checked={useItems}
                onChange={checked => {
                  refUseItems.current = checked;
                  valueUpdated();
                }}
              />

              {useItems && (
                <VolumeItemsEditorAccordion
                  id="keys-items"
                  state={[sectionExpanded, setSectionExpanded]}
                  value={viewModel.configMap?.items || []}
                  onUpdate={updatedItems => {
                    viewModel.configMap = viewModel.configMap || { name: '' };
                    viewModel.configMap.items = updatedItems;
                    valueUpdated();
                  }}
                  keys={configMapKeys}
                />
              )}
            </Fragment>
          )}

          {source === 'secret' && (
            <Fragment>
              <Autocomplete
                allowArbitraryValues
                label="Secret"
                options={secretNames}
                value={viewModel.secret?.secretName ?? ''}
                onInputChange={name => {
                  viewModel.secret = viewModel.secret || {};
                  viewModel.secret.secretName = name;
                  valueUpdated();
                }}
              />

              <Checkbox
                label="Optional, secret is not required to exist"
                checked={!!viewModel.secret?.optional}
                onChange={isChecked => {
                  viewModel.secret = viewModel.secret || {};
                  viewModel.secret.optional = isChecked || undefined;
                  valueUpdated();
                }}
              />

              <Checkbox
                label="Specify keys to map from secret"
                checked={useItems}
                onChange={checked => {
                  refUseItems.current = checked;
                  valueUpdated();
                }}
              />

              {useItems && (
                <VolumeItemsEditorAccordion
                  id="key-items"
                  state={[sectionExpanded, setSectionExpanded]}
                  value={viewModel.secret?.items || []}
                  onUpdate={updatedItems => {
                    viewModel.secret = viewModel.secret || {};
                    viewModel.secret.items = updatedItems;
                    valueUpdated();
                  }}
                  keys={secretKeys}
                />
              )}
            </Fragment>
          )}

          {source === 'persistent volume claim' && (
            <Fragment>
              <Autocomplete
                allowArbitraryValues
                label="Persistent Volume Claim"
                options={persistentVolumeClaimNames}
                value={viewModel.persistentVolumeClaim?.claimName ?? ''}
                onInputChange={name => {
                  viewModel.persistentVolumeClaim =
                    viewModel.persistentVolumeClaim || { claimName: '' };
                  viewModel.persistentVolumeClaim.claimName = name;
                  valueUpdated();
                }}
              />

              <Checkbox
                label="Readonly volume"
                checked={!!viewModel.persistentVolumeClaim?.readOnly}
                onChange={checked => {
                  viewModel.persistentVolumeClaim =
                    viewModel.persistentVolumeClaim || { claimName: '' };
                  viewModel.persistentVolumeClaim.readOnly =
                    checked || undefined;
                  valueUpdated();
                }}
              />
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
