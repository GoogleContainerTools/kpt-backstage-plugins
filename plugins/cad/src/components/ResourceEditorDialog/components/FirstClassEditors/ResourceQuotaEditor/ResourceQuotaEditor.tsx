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

import { TextField } from '@material-ui/core';
import React, { ChangeEvent, Fragment, useEffect, useState } from 'react';
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import { ResourceQuota } from '../../../../../types/ResourceQuota';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { EditorAccordion } from '../Controls/EditorAccordion';
import { KeyValueEditorAccordion } from '../Controls/KeyValueEditorAccordion';
import { SingleTextFieldAccordion } from '../Controls/SingleTextFieldAccordion';
import { useEditorStyles } from '../styles';

type OnUpdatedYamlFn = (yaml: string) => void;

type ResourceQuotaEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
};

type State = {
  name: string;
  namespace: string;
  annotations: KubernetesKeyValueObject;
  labels: KubernetesKeyValueObject;
  requestsCpu: string;
  requestsMemory: string;
  limitsCpu: string;
  limitsMemory: string;
};

export const ResourceQuotaEditor = ({
  yaml,
  onUpdatedYaml,
}: ResourceQuotaEditorProps) => {
  const resourceYaml = loadYaml(yaml) as ResourceQuota;

  const specHard = resourceYaml.spec?.hard;
  const useCPURequestsPrefix = !specHard?.cpu;
  const useMemoryRequestsPrefix = !specHard?.memory;

  const createResourceState = (): State => ({
    name: resourceYaml.metadata.name,
    annotations: resourceYaml.metadata.annotations ?? {},
    labels: resourceYaml.metadata.labels ?? {},
    namespace: resourceYaml.metadata.namespace ?? '',
    requestsCpu: specHard?.cpu ?? specHard?.['requests.cpu'] ?? '',
    requestsMemory: specHard?.memory ?? specHard?.['requests.memory'] ?? '',
    limitsCpu: resourceYaml.spec?.hard?.['limits.cpu'] ?? '',
    limitsMemory: resourceYaml.spec?.hard?.['limits.memory'] ?? '',
  });

  const [state, setState] = useState<State>(createResourceState());
  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    resourceYaml.metadata.name = state.name;
    resourceYaml.metadata.namespace = state.namespace || undefined;
    resourceYaml.metadata.labels = state.labels;
    resourceYaml.metadata.annotations = state.annotations;
    resourceYaml.spec = resourceYaml.spec ?? {};
    resourceYaml.spec.hard = {
      ...resourceYaml.spec.hard,
      'limits.cpu': state.limitsCpu || undefined,
      'limits.memory': state.limitsMemory || undefined,
      'requests.cpu': useCPURequestsPrefix
        ? state.requestsCpu || undefined
        : undefined,
      'requests.memory': useMemoryRequestsPrefix
        ? state.requestsMemory || undefined
        : undefined,
      cpu: !useCPURequestsPrefix ? state.requestsCpu || undefined : undefined,
      memory: !useMemoryRequestsPrefix
        ? state.requestsMemory || undefined
        : undefined,
    };

    if (state.annotations && Object.keys(state.annotations).length === 0) {
      delete resourceYaml.metadata.annotations;
    }
    if (state.labels && Object.keys(state.labels).length === 0) {
      delete resourceYaml.metadata.labels;
    }

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [
    state,
    onUpdatedYaml,
    resourceYaml,
    useCPURequestsPrefix,
    useMemoryRequestsPrefix,
  ]);

  const computeResourcesDescription = `${
    Object.keys(resourceYaml?.spec?.hard ?? {}).length
  } set`;

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
      <EditorAccordion
        title="Compute Resources"
        expanded={expanded === 'compute'}
        onChange={handleChange('compute')}
        description={computeResourcesDescription}
      >
        <Fragment>
          <div className={classes.multiControlRow}>
            <TextField
              label="Max CPU Requests"
              variant="outlined"
              value={state.requestsCpu}
              onChange={e =>
                setState(s => ({ ...s, requestsCpu: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Max CPU Limits"
              variant="outlined"
              value={state.limitsCpu}
              onChange={e =>
                setState(s => ({ ...s, limitsCpu: e.target.value }))
              }
              fullWidth
            />
          </div>
          <div className={classes.multiControlRow}>
            <TextField
              label="Max Memory Requests"
              variant="outlined"
              value={state.requestsMemory}
              onChange={e =>
                setState(s => ({ ...s, requestsMemory: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Max Memory Limits"
              variant="outlined"
              value={state.limitsMemory}
              onChange={e =>
                setState(s => ({ ...s, limitsMemory: e.target.value }))
              }
              fullWidth
            />
          </div>
        </Fragment>
      </EditorAccordion>
    </div>
  );
};
