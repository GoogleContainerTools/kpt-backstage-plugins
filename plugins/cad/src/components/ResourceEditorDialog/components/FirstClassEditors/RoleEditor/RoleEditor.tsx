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

import { Button } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import React, { useEffect, useState } from 'react';
import { PolicyRule, Role, RoleMetadata } from '../../../../../types/Role';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { ResourceMetadataAccordion } from '../Controls';
import { useEditorStyles } from '../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  updateList,
} from '../util/deletable';
import { RoleRuleEditorAccordion } from './components/RoleRuleEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type RoleEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
};

type State = {
  metadata: RoleMetadata;
  rules: Deletable<PolicyRule>[];
};

export const RoleEditor = ({ yaml, onUpdatedYaml }: RoleEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Role;

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
    rules: resourceYaml.rules ?? [],
  });

  const [state, setState] = useState<State>(createResourceState());
  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  useEffect(() => {
    resourceYaml.metadata = state.metadata;
    resourceYaml.rules = getActiveElements(state.rules);

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, onUpdatedYaml, resourceYaml]);

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        id="metadata"
        state={[expanded, setExpanded]}
        value={state.metadata}
        onUpdate={metadata => setState(s => ({ ...s, metadata }))}
      />

      {state.rules.map(
        (rule, index) =>
          isActiveElement(rule) && (
            <RoleRuleEditorAccordion
              id={`rule-${index}`}
              key={`rule-${index}`}
              title="Rule"
              state={[expanded, setExpanded]}
              value={rule}
              onUpdate={updatedRule =>
                setState(s => ({
                  ...s,
                  rules: updateList(s.rules.slice(), updatedRule, index),
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
            setState(s => ({ ...s, rules: [...s.rules, {}] }));
            setExpanded(`rule-${state.rules.length}`);
          }}
        >
          Add Rule
        </Button>
      </div>
    </div>
  );
};
