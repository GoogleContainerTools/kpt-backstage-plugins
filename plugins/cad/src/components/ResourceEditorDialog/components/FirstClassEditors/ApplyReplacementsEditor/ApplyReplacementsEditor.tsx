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
import React, { Fragment, useEffect, useState } from 'react';
import {
  ApplyReplacement,
  ApplyReplacementMetadata,
  ReplacementOptions,
  ReplacementResourceSelector,
  ReplacementSource,
  ReplacementTarget,
} from '../../../../../types/ApplyReplacement';
import {
  KubernetesKeyValueObject,
  KubernetesResource,
} from '../../../../../types/KubernetesResource';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../utils/selectItem';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { Select } from '../../../../Controls/Select';
import { EditorAccordion, ResourceMetadataAccordion } from '../Controls';
import { useEditorStyles } from '../styles';

type OnUpdatedYamlFn = (yaml: string) => void;

type ApplyReplacementsEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: ApplyReplacementMetadata;
};

type ReplacementState = {
  resourceId: string;
  resourceKind: string;
  resourceName: string;
  replaceValueOption: string;
  fieldPath: string;
  delimiter: string;
  index: string;
};

type FlattenResource = {
  [key: string]: string;
};

enum ReplaceFieldValueOption {
  FULL = 'Full',
  PARTIAL = 'Partial',
}

const flattenResource = (resource: KubernetesResource): FlattenResource => {
  const keyValue: KubernetesKeyValueObject = {};

  const flattenObject = (inputObject: object, keyPrefix: string = ''): void => {
    Object.entries(inputObject).forEach(([key, value]) => {
      const escapedKey = key.replaceAll('.', '\\.');
      const fullKey = keyPrefix + (keyPrefix ? '.' : '') + escapedKey;

      if (typeof value === 'object') {
        flattenObject(value, fullKey);
      } else {
        keyValue[fullKey] = value;
      }
    });
  };

  flattenObject(resource);

  return keyValue;
};

const getPathSelectItems = (
  packageResources: PackageResource[],
  resourceId: string,
): SelectItem[] => {
  const resource = packageResources.find(
    thisResource => thisResource.id === resourceId,
  );

  if (resource) {
    const k8Resource = loadYaml(resource.yaml) as KubernetesResource;
    const flatResource = flattenResource(k8Resource);

    return Object.entries(flatResource)
      .filter(([key]) => key !== 'apiVersion' && key !== 'kind')
      .map(([key, value]) => ({
        label: `${key}: ${value}`,
        value: key,
      }));
  }

  return [];
};

const getIndexSelectItems = (
  packageResources: PackageResource[],
  replacementState: ReplacementState,
): SelectItem[] => {
  if (
    replacementState.replaceValueOption === ReplaceFieldValueOption.PARTIAL &&
    replacementState.delimiter
  ) {
    const resource = packageResources.find(
      thisResource => thisResource.id === replacementState.resourceId,
    );

    if (resource) {
      const k8Resource = loadYaml(resource.yaml) as KubernetesResource;
      const flatResource = flattenResource(k8Resource);

      const value = flatResource[replacementState.fieldPath];

      if (value) {
        const potentialValues = value.split(replacementState.delimiter);

        const selectItems: SelectItem[] = potentialValues.map(
          (stringValue, index) => ({
            label: stringValue,
            value: index,
          }),
        );

        return selectItems;
      }
    }
  }

  return [];
};

const getPackageSelectItems = (
  packageResources: PackageResource[],
): SelectItem[] => {
  return sortByLabel(
    packageResources
      .filter(resource => resource.kind !== 'ApplyReplacements')
      .map(resource => ({
        label: `${resource.kind}: ${resource.name}`,
        value: resource.id,
      })),
  );
};

const replaceFieldValueSelectItems: SelectItem[] = [
  {
    label: 'Full value',
    value: ReplaceFieldValueOption.FULL,
  },
  {
    label: 'Partial value',
    value: ReplaceFieldValueOption.PARTIAL,
  },
];

const delimiterOptionsSelectItems: SelectItem[] = [
  {
    label: 'Period (.)',
    value: '.',
  },
  {
    label: 'At Symbol (@)',
    value: '@',
  },
];

export const ApplyReplacementsEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: ApplyReplacementsEditorProps) => {
  const resourceYaml = loadYaml(yaml) as ApplyReplacement;

  const packageResourcesSelectItems: SelectItem[] =
    getPackageSelectItems(packageResources);

  const findResource = (
    selector?: ReplacementResourceSelector,
  ): PackageResource | undefined => {
    if (selector && selector.kind && selector.name) {
      return packageResources.find(
        thisResource =>
          thisResource.kind === selector.kind &&
          thisResource.name === selector.name,
      );
    }

    return undefined;
  };

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
  });

  const createReplacementState = (
    resourceSelector?: ReplacementResourceSelector,
    fieldPath?: string,
    replacementOptions?: ReplacementOptions,
  ): ReplacementState => ({
    resourceId: findResource(resourceSelector)?.id ?? '',
    resourceKind: resourceSelector?.kind ?? '',
    resourceName: resourceSelector?.name ?? '',
    fieldPath: fieldPath ?? '',
    replaceValueOption: replacementOptions?.delimiter
      ? ReplaceFieldValueOption.PARTIAL
      : ReplaceFieldValueOption.FULL,
    delimiter: replacementOptions?.delimiter ?? '',
    index: (replacementOptions?.index ?? '').toString(),
  });

  const firstReplacement = resourceYaml?.replacements?.[0];
  const firstReplacementTarget = resourceYaml?.replacements?.[0].targets?.[0];

  const [state, setState] = useState<State>(createResourceState());
  const [sourceState, setSourceState] = useState<ReplacementState>(
    createReplacementState(
      firstReplacement?.source,
      firstReplacement?.source?.fieldPath,
      undefined,
    ),
  );
  const [targetState, setTargetState] = useState<ReplacementState>(
    createReplacementState(
      firstReplacementTarget?.select,
      firstReplacementTarget?.fieldPaths?.[0],
      firstReplacementTarget?.options,
    ),
  );

  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  const sourcePathSelectItems: SelectItem[] = getPathSelectItems(
    packageResources,
    sourceState.resourceId,
  );
  const targetPathSelectItems: SelectItem[] = getPathSelectItems(
    packageResources,
    targetState.resourceId,
  );
  const targetIndexSelectItems: SelectItem[] = getIndexSelectItems(
    packageResources,
    targetState,
  );

  useEffect(() => {
    const replacementSource: ReplacementSource = {
      kind: sourceState.resourceKind,
      name: sourceState.resourceName,
      fieldPath: sourceState.fieldPath,
    };

    const replacementTarget: ReplacementTarget = {
      select: {
        kind: targetState.resourceKind,
        name: targetState.resourceName,
      },
      fieldPaths: [targetState.fieldPath],
    };

    if (
      targetState.replaceValueOption === ReplaceFieldValueOption.PARTIAL &&
      targetState.delimiter
    ) {
      replacementTarget.options = {
        delimiter: targetState.delimiter,
        index: parseInt(targetState.index, 10),
      };
    }

    resourceYaml.metadata = state.metadata;
    resourceYaml.replacements = [
      {
        source: replacementSource,
        targets: [replacementTarget],
      },
    ];

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, sourceState, targetState, onUpdatedYaml, resourceYaml]);

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        clusterScopedResource
        id="metadata"
        state={[expanded, setExpanded]}
        value={state.metadata}
        onUpdate={metadata => setState(s => ({ ...s, metadata }))}
      />

      <EditorAccordion
        id="source"
        title="Source"
        description={`${sourceState.resourceKind} ${sourceState.resourceName}`}
        state={[expanded, setExpanded]}
      >
        <Fragment>
          <Select
            label="Source Resource"
            items={packageResourcesSelectItems}
            selected={sourceState.resourceId}
            onChange={resourceId => {
              const resource = packageResources.find(r => r.id === resourceId);

              if (resource) {
                setSourceState(s => ({
                  ...s,
                  resourceId: resourceId,
                  resourceKind: resource.kind,
                  resourceName: resource.name,
                }));
              }
            }}
          />

          <Select
            label="Source Path"
            items={sourcePathSelectItems}
            selected={sourceState.fieldPath}
            onChange={fieldPath =>
              setSourceState(s => ({
                ...s,
                fieldPath,
              }))
            }
          />
        </Fragment>
      </EditorAccordion>

      <EditorAccordion
        id="target"
        title="Target"
        description={`${targetState.resourceKind} ${targetState.resourceName}`}
        state={[expanded, setExpanded]}
      >
        <Fragment>
          <Select
            label="Target Resource"
            items={packageResourcesSelectItems}
            selected={targetState.resourceId}
            onChange={resourceId => {
              const resource = packageResources.find(r => r.id === resourceId);

              if (resource) {
                setTargetState(s => ({
                  ...s,
                  resourceId: resourceId,
                  resourceKind: resource.kind,
                  resourceName: resource.name,
                }));
              }
            }}
          />

          <Select
            label="Target Path"
            items={targetPathSelectItems}
            selected={targetState.fieldPath}
            onChange={fieldPath =>
              setTargetState(s => ({
                ...s,
                fieldPath,
              }))
            }
          />

          <div className={classes.multiControlRow}>
            <Select
              label="Replace Value Options"
              items={replaceFieldValueSelectItems}
              selected={targetState.replaceValueOption}
              onChange={replaceValueOption =>
                setTargetState(s => ({
                  ...s,
                  replaceValueOption,
                }))
              }
            />

            {targetState.replaceValueOption ===
            ReplaceFieldValueOption.PARTIAL ? (
              <Fragment>
                <Select
                  label="Delimiter"
                  items={delimiterOptionsSelectItems}
                  selected={targetState.delimiter}
                  onChange={delimiter =>
                    setTargetState(s => ({
                      ...s,
                      delimiter,
                    }))
                  }
                />

                <Select
                  label="Replace"
                  items={targetIndexSelectItems}
                  selected={targetState.index}
                  onChange={index =>
                    setTargetState(s => ({
                      ...s,
                      index,
                    }))
                  }
                />
              </Fragment>
            ) : (
              <Fragment>
                <TextField
                  label="Delimiter"
                  variant="outlined"
                  disabled
                  fullWidth
                  value="Not applicable"
                />

                <TextField
                  label="Replace"
                  variant="outlined"
                  disabled
                  fullWidth
                  value="Not applicable"
                />
              </Fragment>
            )}
          </div>
        </Fragment>
      </EditorAccordion>
    </div>
  );
};
