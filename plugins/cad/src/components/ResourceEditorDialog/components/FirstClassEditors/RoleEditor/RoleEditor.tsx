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
import { last, omit } from 'lodash';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { Role, PolicyRule, RoleMetadata } from '../../../../../types/Role';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { ResourceMetadataAccordion } from '../Controls';
import { useEditorStyles } from '../styles';
import { RoleRuleEditorAccordion } from './components/RoleRuleEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type RoleEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
};

type State = {
  metadata: RoleMetadata;
};

export type RoleRuleView = PolicyRule & {
  key: number;
};

export const RoleEditor = ({ yaml, onUpdatedYaml }: RoleEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Role;

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
  });

  const mapRuleToView = (rule: PolicyRule, idx: number): RoleRuleView => ({
    key: idx,
    ...rule,
  });

  const [state, setState] = useState<State>(createResourceState());
  const [rules, setRules] = useState<RoleRuleView[]>(
    (resourceYaml.rules ?? []).map(mapRuleToView),
  );
  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    const mapToRule = (rule: RoleRuleView): PolicyRule => omit(rule, 'key');

    resourceYaml.metadata = state.metadata;
    resourceYaml.rules = rules.map(mapToRule);

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, rules, onUpdatedYaml, resourceYaml]);

  const onRuleUpdated = (currentRule: RoleRuleView, rule?: RoleRuleView) => {
    const idx = rules.indexOf(currentRule);
    const rulesList = rules.slice();
    if (rule) {
      rulesList[idx] = rule;
    } else {
      rulesList.splice(idx, 1);
    }
    setRules(rulesList);
  };

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        expanded={expanded === 'metadata'}
        onChange={handleChange('metadata')}
        value={state.metadata}
        onUpdate={metadata => {
          setState(s => ({ ...s, metadata }));
        }}
      />

      {rules.map((rule, idx) => (
        <RoleRuleEditorAccordion
          key={rule.key}
          title={`Rule ${idx + 1}`}
          expanded={expanded === `rule-${rule.key}`}
          onChange={handleChange(`rule-${rule.key}`)}
          rule={rule}
          onUpdatedRule={onRuleUpdated}
        />
      ))}

      <div className={classes.buttonRow}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            const nextKey = (last(rules)?.key || 0) + 1;
            setRules([...rules, { key: nextKey }]);
            setExpanded(`rule-${nextKey}`);
          }}
        >
          Add Rule
        </Button>
      </div>
    </div>
  );
};
