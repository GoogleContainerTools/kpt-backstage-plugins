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
import { Button, TextField } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { omit, startCase } from 'lodash';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import {
  Service,
  ServiceMetadata,
  ServicePort,
} from '../../../../../types/Service';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../utils/selectItem';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { Select } from '../../../../Controls/Select';
import { EditorAccordion, ResourceMetadataAccordion } from '../Controls';
import { useEditorStyles } from '../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  updateList,
} from '../util/deletable';
import { ServicePortEditorAccordion } from './components/ServicePortEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type ServiceEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: ServiceMetadata;
  type: string;
  selector: string;
  externalTrafficPolicy: string;
  externalName: string;
  servicePorts: Deletable<ServicePort>[];
};

type WorkloadSelectItem = SelectItem & {
  selectorLabels: KubernetesKeyValueObject;
};

const EXTERNAL_TRAFFIC_POLICY = ['Cluster', 'Local'];
const SERVICE_TYPES = ['ExternalName', 'ClusterIP', 'NodePort', 'LoadBalancer'];

const externalTrafficPolicySelectItems: SelectItem[] = sortByLabel(
  EXTERNAL_TRAFFIC_POLICY.map(type => ({ label: type, value: type })),
);

const serviceTypeSelectItems: SelectItem[] = sortByLabel(
  SERVICE_TYPES.map(type => ({ label: startCase(type), value: type })),
);

const keyValueObjHash = (keyValueObject: KubernetesKeyValueObject): string =>
  Object.keys(keyValueObject)
    .map(key => `${key}:${keyValueObject[key]}`)
    .join('|');

export const ServiceEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: ServiceEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Service;
  resourceYaml.spec = resourceYaml.spec ?? {};

  const workloadResources = useMemo(
    () =>
      packageResources.filter(
        resource =>
          resource.kind === 'Deployment' ||
          resource.kind === 'StatefulSet' ||
          resource.kind === 'DaemonSet',
      ),
    [packageResources],
  );

  const workloadSelectItems: WorkloadSelectItem[] = useMemo(() => {
    return sortByLabel(
      workloadResources.map(workload => ({
        label: `${workload.kind}: ${workload.name}`,
        value: workload.name,
        selectorLabels: loadYaml(workload.yaml).spec.selector
          .matchLabels as KubernetesKeyValueObject,
      })),
    ) as WorkloadSelectItem[];
  }, [workloadResources]);

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
    selector:
      (workloadSelectItems.find(
        s =>
          keyValueObjHash(s.selectorLabels || {}) ===
          keyValueObjHash(resourceYaml.spec.selector || {}),
      )?.value as string) || '',
    type: resourceYaml.spec.type || 'ClusterIP',
    externalTrafficPolicy: resourceYaml.spec.externalTrafficPolicy || 'Cluster',
    externalName: resourceYaml.spec.externalName ?? '',
    servicePorts: resourceYaml.spec.ports ?? [],
  });

  const [state, setState] = useState<State>(createResourceState());

  const isExternalTrafficPolicyRelevant =
    state.type === 'LoadBalancer' || state.type === 'NodePort';
  const isExternalNameRelevant = state.type === 'ExternalName';
  const isTargetRelevant = state.type !== 'ExternalName';

  const targetPodTemplateSpec = useMemo(() => {
    const targetResource = workloadResources.find(
      workload => workload.name === state.selector,
    );

    return targetResource
      ? loadYaml(targetResource.yaml).spec.template
      : undefined;
  }, [workloadResources, state.selector]);

  const [expanded, setExpanded] = useState<string>();

  const classes = useEditorStyles();

  useEffect(() => {
    const servicePortOmitKeys: string[] = [];
    if (state.type === 'ClusterIP') servicePortOmitKeys.push('nodePort');

    resourceYaml.metadata = state.metadata;
    resourceYaml.spec.type = state.type;
    resourceYaml.spec.selector = isTargetRelevant
      ? workloadSelectItems.find(s => s.value === state.selector)
          ?.selectorLabels
      : undefined;
    resourceYaml.spec.ports = isTargetRelevant
      ? getActiveElements(state.servicePorts).map(servicePort =>
          omit(servicePort, servicePortOmitKeys),
        )
      : undefined;
    resourceYaml.spec.externalTrafficPolicy = isExternalTrafficPolicyRelevant
      ? state.externalTrafficPolicy
      : undefined;
    resourceYaml.spec.externalName = isExternalNameRelevant
      ? state.externalName
      : undefined;

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [
    state,
    onUpdatedYaml,
    resourceYaml,
    isExternalNameRelevant,
    isExternalTrafficPolicyRelevant,
    isTargetRelevant,
    workloadSelectItems,
  ]);

  const getServiceDescription = (): string => {
    const target =
      state.type === 'ExternalName' ? state.externalName : state.selector;

    return `${startCase(state.type)} ${target ? `→ ${target}` : ''}`;
  };

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        id="metadata"
        value={state.metadata}
        state={[expanded, setExpanded]}
        onUpdate={metadata => setState(s => ({ ...s, metadata }))}
      />

      <EditorAccordion
        id="service"
        title="Service"
        description={getServiceDescription()}
        state={[expanded, setExpanded]}
      >
        <Fragment>
          <Select
            label="Service Type"
            items={serviceTypeSelectItems}
            selected={state.type}
            onChange={v => setState(s => ({ ...s, type: v }))}
          />

          {isExternalTrafficPolicyRelevant && (
            <Select
              label="External Traffic Type"
              items={externalTrafficPolicySelectItems}
              selected={state.externalTrafficPolicy}
              onChange={v =>
                setState(s => ({ ...s, externalTrafficPolicy: v }))
              }
            />
          )}

          {isExternalNameRelevant && (
            <TextField
              label="External Name"
              variant="outlined"
              value={state.externalName}
              onChange={e =>
                setState(s => ({ ...s, externalName: e.target.value }))
              }
              fullWidth
            />
          )}

          {isTargetRelevant && (
            <Select
              label="Target Pods"
              items={workloadSelectItems}
              selected={state.selector}
              onChange={v => setState(s => ({ ...s, selector: v }))}
            />
          )}
        </Fragment>
      </EditorAccordion>

      {isTargetRelevant &&
        targetPodTemplateSpec &&
        state.servicePorts.map(
          (servicePort, index) =>
            isActiveElement(servicePort) && (
              <ServicePortEditorAccordion
                id={`service-port-${index}`}
                key={`service-port-${index}`}
                serviceType={state.type}
                state={[expanded, setExpanded]}
                value={servicePort}
                onUpdate={updatedServicePort =>
                  setState(s => ({
                    ...s,
                    servicePorts: updateList(
                      s.servicePorts.slice(),
                      updatedServicePort,
                      index,
                    ),
                  }))
                }
                targetPodTemplateSpec={targetPodTemplateSpec}
              />
            ),
        )}

      {isTargetRelevant && targetPodTemplateSpec && (
        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setState(s => ({ ...s, servicePorts: [...s.servicePorts, {}] }));
              setExpanded(`service-port-${state.servicePorts.length}`);
            }}
          >
            Add Service Port
          </Button>
        </div>
      )}
    </div>
  );
};
