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
import { last, omit, startCase } from 'lodash';
import React, {
  ChangeEvent,
  Fragment,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
};

type WorkloadSelectItem = SelectItem & {
  selectorLabels: KubernetesKeyValueObject;
};

export type ServicePortView = ServicePort & {
  key: number;
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

  const mapServicePortToView = (
    servicePort: ServicePort,
    idx: number,
  ): ServicePortView => ({
    key: idx,
    ...servicePort,
  });

  const [servicePorts, setServicePorts] = useState<ServicePortView[]>(
    (resourceYaml.spec.ports ?? []).map(mapServicePortToView),
  );

  const classes = useEditorStyles();

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    const servicePortOmitKeys = ['key'];
    if (state.type === 'ClusterIP') servicePortOmitKeys.push('nodePort');

    const mapToServicePort = (servicePortView: ServicePortView): ServicePort =>
      omit(servicePortView, servicePortOmitKeys);

    resourceYaml.metadata = state.metadata;
    resourceYaml.spec.type = state.type;
    resourceYaml.spec.selector = isTargetRelevant
      ? workloadSelectItems.find(s => s.value === state.selector)
          ?.selectorLabels
      : undefined;
    resourceYaml.spec.ports = isTargetRelevant
      ? servicePorts.map(mapToServicePort)
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
    servicePorts,
    workloadSelectItems,
  ]);

  const onServicePortUpdated = (
    currentServicePort: ServicePortView,
    updatedServicePort?: ServicePortView,
  ) => {
    const idx = servicePorts.indexOf(currentServicePort);
    const list = servicePorts.slice();
    if (updatedServicePort) {
      list[idx] = updatedServicePort;
    } else {
      list.splice(idx, 1);
    }
    setServicePorts(list);
  };

  const getServiceDescription = (): string => {
    const target =
      state.type === 'ExternalName' ? state.externalName : state.selector;

    return `${startCase(state.type)} ${target ? `→ ${target}` : ''}`;
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

      <EditorAccordion
        title="Service"
        description={getServiceDescription()}
        expanded={expanded === 'role'}
        onChange={handleChange('role')}
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
        servicePorts.map(servicePort => (
          <ServicePortEditorAccordion
            key={servicePort.key}
            serviceType={state.type}
            expanded={expanded === `service-port-${servicePort.key}`}
            onChange={handleChange(`service-port-${servicePort.key}`)}
            servicePort={servicePort}
            onUpdatedServicePort={onServicePortUpdated}
            targetPodTemplateSpec={targetPodTemplateSpec}
          />
        ))}

      {isTargetRelevant && targetPodTemplateSpec && (
        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const nextKey = (last(servicePorts)?.key || 0) + 1;
              setServicePorts([...servicePorts, { key: nextKey }]);
              setExpanded(`service-port-${nextKey}`);
            }}
          >
            Add Service Port
          </Button>
        </div>
      )}
    </div>
  );
};
