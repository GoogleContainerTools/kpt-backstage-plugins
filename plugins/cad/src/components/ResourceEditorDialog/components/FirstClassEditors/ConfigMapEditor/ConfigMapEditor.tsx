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

import React, { ChangeEvent, useEffect, useState } from 'react';
import { ConfigMap } from '../../../../../types/ConfigMap';
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { KeyValueEditorAccordion } from '../Controls/KeyValueEditorAccordion';
import { SingleTextFieldAccordion } from '../Controls/SingleTextFieldAccordion';
import { useEditorStyles } from '../styles';

type OnUpdatedYamlFn = (yaml: string) => void;

type ResourceEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
};

type State = {
  name: string;
  namespace: string;
  data: KubernetesKeyValueObject;
  annotations: KubernetesKeyValueObject;
  labels: KubernetesKeyValueObject;
};

export const ConfigMapEditor = ({
  yaml,
  onUpdatedYaml,
}: ResourceEditorProps) => {
  const resourceYaml = loadYaml(yaml) as ConfigMap;

  const createResourceState = (): State => ({
    name: resourceYaml.metadata.name,
    annotations: resourceYaml.metadata.annotations ?? {},
    labels: resourceYaml.metadata.labels ?? {},
    namespace: resourceYaml.metadata.namespace ?? '',
    data: resourceYaml.data,
  });

  const classes = useEditorStyles();

  const [state, setState] = useState<State>(createResourceState());
  const [expanded, setExpanded] = useState<string>();

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    resourceYaml.metadata.name = state.name;
    resourceYaml.metadata.namespace = state.namespace || undefined;
    resourceYaml.metadata.labels = state.labels;
    resourceYaml.metadata.annotations = state.annotations;
    resourceYaml.data = state.data;

    if (state.annotations && Object.keys(state.annotations).length === 0) {
      delete resourceYaml.metadata.annotations;
    }
    if (state.labels && Object.keys(state.labels).length === 0) {
      delete resourceYaml.metadata.labels;
    }

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, resourceYaml, onUpdatedYaml]);

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
      <KeyValueEditorAccordion
        title="Data"
        expanded={expanded === 'data'}
        onChange={handleChange('data')}
        keyValueObject={state.data}
        onUpdatedKeyValueObject={data => setState(s => ({ ...s, data: data }))}
      />
    </div>
  );
};
