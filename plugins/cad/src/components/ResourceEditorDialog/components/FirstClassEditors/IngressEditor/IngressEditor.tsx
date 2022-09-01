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
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Ingress,
  IngressBackend,
  IngressMetadata,
  IngressRule,
  IngressTLS,
} from '../../../../../types/Ingress';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { ResourceMetadataAccordion } from '../Controls/ResourceMetadataAccordion';
import { useEditorStyles } from '../styles';
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

type DeleteField = {
  _isDeleted?: boolean;
};

type State = {
  metadata: IngressMetadata;
  ingressClassName: string | undefined;
  defaultBackend?: IngressBackend;
  tls: (IngressTLS & DeleteField)[];
  rules: (IngressRule & DeleteField)[];
};

const updateList = <T,>(
  list: T[],
  newValue: T | undefined,
  idx: number,
): T[] => {
  list[idx] = newValue || { ...list[idx], _isDeleted: true };
  return list;
};

const getArray = <T extends DeleteField>(list: T[]): T[] | undefined => {
  const filterDeletedElements = (arr: T[]): T[] =>
    arr.filter(t => !t._isDeleted);

  const undefinedIfEmpty = (arr: T[]): T[] | undefined =>
    arr.length > 0 ? arr : undefined;

  return undefinedIfEmpty(filterDeletedElements(list));
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

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    resourceYaml.metadata = state.metadata;
    resourceYaml.spec.ingressClassName = state.ingressClassName;
    resourceYaml.spec.defaultBackend = state.defaultBackend;
    resourceYaml.spec.tls = getArray(state.tls);
    resourceYaml.spec.rules = getArray(state.rules);

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, onUpdatedYaml, resourceYaml]);

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

      <CustomControllerEditorAccordion
        expanded={expanded === 'custom-controller'}
        onChange={handleChange('custom-controller')}
        value={state.ingressClassName}
        onUpdate={ingressClassName => {
          setState(s => ({ ...s, ingressClassName }));
        }}
      />

      <DefaultBackendEditorAccordion
        expanded={expanded === 'default-backend'}
        onChange={handleChange('default-backend')}
        value={state.defaultBackend}
        onUpdate={defaultBackend => {
          setState(s => ({ ...s, defaultBackend }));
        }}
        serviceResources={serviceResources}
      />

      {state.tls.map(
        (tls, index) =>
          !tls._isDeleted && (
            <TLSEditorAccordion
              key={`tls-${index}`}
              expanded={expanded === `tls-${index}`}
              onChange={handleChange(`tls-${index}`)}
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
          !ingressRule._isDeleted && (
            <IngressRuleEditorAccordion
              key={`rule-${index}`}
              expanded={expanded === `rule-${index}`}
              onChange={handleChange(`rule-${index}`)}
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
