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
import React, { useEffect, useMemo, useState } from 'react';
import {
  Ingress,
  IngressBackend,
  IngressMetadata,
  IngressRule,
  IngressTLS,
} from '../../../../../types/Ingress';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { ResourceMetadataAccordion } from '../Controls';
import { useEditorStyles } from '../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  undefinedIfEmpty,
  updateList,
} from '../util/deletable';
import { CustomControllerEditorAccordion } from './components/CustomControllerEditorAccordion';
import { DefaultBackendEditorAccordion } from './components/DefaultBackendEditorAccordion';
import { IngressRuleEditorAccordion } from './components/IngressRuleEditorAccordion';
import { TLSEditorAccordion } from './components/TLSEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type IngressEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: IngressMetadata;
  ingressClassName: string | undefined;
  defaultBackend?: IngressBackend;
  tls: Deletable<IngressTLS>[];
  rules: Deletable<IngressRule>[];
};

export const IngressEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: IngressEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Ingress;
  resourceYaml.spec = resourceYaml.spec ?? {};

  const serviceResources = useMemo(
    () => packageResources.filter(resource => resource.kind === 'Service'),
    [packageResources],
  );

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
    ingressClassName: resourceYaml.spec.ingressClassName,
    defaultBackend: resourceYaml.spec.defaultBackend,
    tls: resourceYaml.spec.tls ?? [],
    rules: resourceYaml.spec.rules ?? [],
  });

  const [state, setState] = useState<State>(createResourceState());
  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  useEffect(() => {
    resourceYaml.metadata = state.metadata;
    resourceYaml.spec.ingressClassName = state.ingressClassName;
    resourceYaml.spec.defaultBackend = state.defaultBackend;
    resourceYaml.spec.tls = undefinedIfEmpty(getActiveElements(state.tls));
    resourceYaml.spec.rules = undefinedIfEmpty(getActiveElements(state.rules));

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

      <CustomControllerEditorAccordion
        id="custom-controller"
        state={[expanded, setExpanded]}
        value={state.ingressClassName}
        onUpdate={ingressClassName => {
          setState(s => ({ ...s, ingressClassName }));
        }}
      />

      <DefaultBackendEditorAccordion
        id="default-backend"
        state={[expanded, setExpanded]}
        value={state.defaultBackend}
        onUpdate={defaultBackend => {
          setState(s => ({ ...s, defaultBackend }));
        }}
        serviceResources={serviceResources}
      />

      {state.tls.map(
        (tls, index) =>
          isActiveElement(tls) && (
            <TLSEditorAccordion
              id={`tls-${index}`}
              key={`tls-${index}`}
              state={[expanded, setExpanded]}
              value={tls}
              onUpdate={updatedTls => {
                setState(s => ({
                  ...s,
                  tls: updateList(s.tls.slice(), updatedTls, index),
                }));
              }}
            />
          ),
      )}

      {state.rules.map(
        (ingressRule, index) =>
          isActiveElement(ingressRule) && (
            <IngressRuleEditorAccordion
              id={`rule-${index}`}
              key={`rule-${index}`}
              state={[expanded, setExpanded]}
              value={ingressRule}
              onUpdate={updatedIngressRule => {
                setState(s => ({
                  ...s,
                  rules: updateList(s.rules.slice(), updatedIngressRule, index),
                }));
              }}
              serviceResources={serviceResources}
            />
          ),
      )}

      <div className={classes.buttonRow}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setState(s => ({ ...s, tls: [...s.tls, {}] }));
            setExpanded(`tls-${state.tls.length}`);
          }}
        >
          Add TLS
        </Button>

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
