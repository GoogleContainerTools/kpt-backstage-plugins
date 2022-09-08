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

import { useApi } from '@backstage/core-plugin-api';
import { Button } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../../../../apis';
import { Function } from '../../../../../types/Function';
import {
  Kptfile,
  KptfileFunction,
  KptfileMetadata,
} from '../../../../../types/Kptfile';
import {
  isMutatorFunction,
  isValidatorFunction,
} from '../../../../../utils/function';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import {
  ResourceMetadataAccordion,
  SingleTextFieldAccordion,
} from '../Controls';
import { useEditorStyles } from '../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  undefinedIfEmpty,
  updateList,
} from '../util/deletable';
import { KptFunctionEditorAccordion } from './components/KptFunctionEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type KptfileEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: KptfileMetadata;
  description: string;
  mutators: Deletable<KptfileFunction>[];
  validators: Deletable<KptfileFunction>[];
};

export const KptfileEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: KptfileEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Kptfile;
  const api = useApi(configAsDataApiRef);

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
    description: resourceYaml.info?.description || '',
    mutators: resourceYaml.pipeline?.mutators ?? [],
    validators: resourceYaml.pipeline?.validators ?? [],
  });

  const [state, setState] = useState<State>(createResourceState());
  const [allKptFunctions, setAllKptFunctions] = useState<Function[]>([]);

  const allKptMutatorFunctions = useMemo(
    () => allKptFunctions.filter(isMutatorFunction),
    [allKptFunctions],
  );
  const allKptValidatorFunctions = useMemo(
    () => allKptFunctions.filter(isValidatorFunction),
    [allKptFunctions],
  );

  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  useAsync(async (): Promise<void> => {
    const allFunctions = await api.listCatalogFunctions();
    setAllKptFunctions(allFunctions);
  }, []);

  useEffect(() => {
    if (!resourceYaml.pipeline) resourceYaml.pipeline = {};

    resourceYaml.metadata = state.metadata;
    resourceYaml.info.description = state.description;
    resourceYaml.pipeline.mutators = undefinedIfEmpty(
      getActiveElements(state.mutators),
    );
    resourceYaml.pipeline.validators = undefinedIfEmpty(
      getActiveElements(state.validators),
    );

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, resourceYaml, onUpdatedYaml]);

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        clusterScopedResource
        id="metadata"
        state={[expanded, setExpanded]}
        value={state.metadata}
        onUpdate={metadata => setState(s => ({ ...s, metadata }))}
      />

      <SingleTextFieldAccordion
        id="package-description"
        title="Package Description"
        state={[expanded, setExpanded]}
        value={state.description}
        onValueUpdated={value => setState(s => ({ ...s, description: value }))}
      />

      {state.mutators.map(
        (mutator, index) =>
          isActiveElement(mutator) && (
            <KptFunctionEditorAccordion
              id={`mutator-${index}`}
              key={`mutator-${index}`}
              title="Mutator"
              state={[expanded, setExpanded]}
              value={mutator}
              allKptFunctions={allKptMutatorFunctions}
              packageResources={packageResources}
              onUpdate={updatedMutator =>
                setState(s => ({
                  ...s,
                  mutators: updateList(
                    s.mutators.slice(),
                    updatedMutator,
                    index,
                  ),
                }))
              }
            />
          ),
      )}

      {state.validators.map(
        (validator, index) =>
          isActiveElement(validator) && (
            <KptFunctionEditorAccordion
              id={`validator-${index}`}
              key={`validator-${index}`}
              title="Validator"
              state={[expanded, setExpanded]}
              value={validator}
              allKptFunctions={allKptValidatorFunctions}
              packageResources={packageResources}
              onUpdate={updatedValidator =>
                setState(s => ({
                  ...s,
                  validators: updateList(
                    s.validators.slice(),
                    updatedValidator,
                    index,
                  ),
                }))
              }
            />
          ),
      )}

      <div className={classes.buttonRow}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setState(s => ({ ...s, mutators: [...s.mutators, { image: '' }] }));
            setExpanded(`mutator-${state.mutators.length}`);
          }}
        >
          Add Mutator
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setState(s => ({
              ...s,
              validators: [...s.validators, { image: '' }],
            }));
            setExpanded(`validator-${state.validators.length}`);
          }}
        >
          Add Validator
        </Button>
      </div>
    </div>
  );
};
