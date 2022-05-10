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
import { dump, load } from 'js-yaml';
import { last, omit } from 'lodash';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import { Role, RoleRule } from '../../../../../types/Role';
import { KeyValueEditorAccordion } from '../Controls/KeyValueEditorAccordion';
import { SingleTextFieldAccordion } from '../Controls/SingleTextFieldAccordion';
import { useEditorStyles } from '../styles';
import { RoleRuleEditorAccordion } from './components/RoleRuleEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type RoleEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
};

type State = {
  name: string;
  namespace: string;
  annotations: KubernetesKeyValueObject;
  labels: KubernetesKeyValueObject;
};

export type RoleRuleView = RoleRule & {
  key: number;
};

export const RoleEditor = ({ yaml, onUpdatedYaml }: RoleEditorProps) => {
  const resourceYaml = load(yaml) as Role;

  const createResourceState = (): State => ({
    name: resourceYaml.metadata.name,
    annotations: resourceYaml.metadata.annotations ?? {},
    labels: resourceYaml.metadata.labels ?? {},
    namespace: resourceYaml.metadata.namespace ?? '',
  });

  const mapRuleToView = (rule: RoleRule, idx: number): RoleRuleView => ({
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
    const mapToRule = (rule: RoleRuleView): RoleRule => omit(rule, 'key');

    resourceYaml.metadata.name = state.name;
    resourceYaml.metadata.namespace = state.namespace || undefined;
    resourceYaml.metadata.labels = state.labels;
    resourceYaml.metadata.annotations = state.annotations;
    resourceYaml.rules = rules.map(mapToRule);

    if (state.annotations && Object.keys(state.annotations).length === 0) {
      delete resourceYaml.metadata.annotations;
    }
    if (state.labels && Object.keys(state.labels).length === 0) {
      delete resourceYaml.metadata.labels;
    }

    onUpdatedYaml(dump(resourceYaml));
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
      <SingleTextFieldAccordion
        title="Name"
        expanded={expanded === 'name'}
        onChange={handleChange('name')}
        value={state.name}
        onValueUpdated={value => setState(s => ({ ...s, name: value }))}
      />
      <SingleTextFieldAccordion
        title="Namespace"
        expanded={expanded === 'namespace'}
        onChange={handleChange('namespace')}
        value={state.namespace}
        onValueUpdated={value => setState(s => ({ ...s, namespace: value }))}
      />
      <KeyValueEditorAccordion
        title="Annotations"
        expanded={expanded === 'annotations'}
        onChange={handleChange('annotations')}
        keyValueObject={state.annotations}
        onUpdatedKeyValueObject={data =>
          setState(s => ({ ...s, annotations: data }))
        }
      />
      <KeyValueEditorAccordion
        title="Labels"
        expanded={expanded === 'labels'}
        onChange={handleChange('labels')}
        keyValueObject={state.labels}
        onUpdatedKeyValueObject={data =>
          setState(s => ({ ...s, labels: data }))
        }
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
