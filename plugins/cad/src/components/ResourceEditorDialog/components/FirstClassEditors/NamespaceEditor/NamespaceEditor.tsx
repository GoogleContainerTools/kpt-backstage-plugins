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
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import { Namespace } from '../../../../../types/Namespace';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { ResourceMetadataAccordion } from '../Controls/ResourceMetadataAccordion';
import { useEditorStyles } from '../styles';

type OnUpdatedYamlFn = (yaml: string) => void;

type ResourceEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
};

type State = {
  name: string;
  annotations?: KubernetesKeyValueObject;
  labels?: KubernetesKeyValueObject;
};

export const NamespaceEditor = ({
  yaml,
  onUpdatedYaml,
}: ResourceEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Namespace;

  const createResourceState = (): State => ({
    name: resourceYaml.metadata.name,
    annotations: resourceYaml.metadata.annotations,
    labels: resourceYaml.metadata.labels,
  });

  const [state, setState] = useState<State>(createResourceState);
  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    resourceYaml.metadata.name = state.name;
    resourceYaml.metadata.labels = state.labels;
    resourceYaml.metadata.annotations = state.annotations;

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, onUpdatedYaml, resourceYaml]);

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        clusterScopedResource
        expanded={expanded === 'metadata'}
        onChange={handleChange('metadata')}
        value={state}
        onUpdate={v => {
          setState(s => ({ ...s, ...v }));
        }}
      />
    </div>
  );
};
