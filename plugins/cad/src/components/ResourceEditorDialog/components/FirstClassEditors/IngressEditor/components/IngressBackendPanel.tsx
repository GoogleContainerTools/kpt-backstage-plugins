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
import { clone } from 'lodash';
import React, { Fragment, useMemo, useRef } from 'react';
import { IngressBackend } from '../../../../../../types/Ingress';
import { Service, ServicePort } from '../../../../../../types/Service';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../../utils/selectItem';
import { loadYaml } from '../../../../../../utils/yaml';
import { Select } from '../../../../../Controls/Select';
import { useEditorStyles } from '../../styles';

type OnUpdate = (newValue: IngressBackend) => void;

type IngressBackendPanelProps = {
  value: IngressBackend;
  onUpdate: OnUpdate;
  serviceResources: PackageResource[];
};

type PortSelectItem = SelectItem & {
  servicePort?: ServicePort;
  serviceName?: string;
};

export const IngressBackendPanel = ({
  value: ingressBackend,
  onUpdate,
  serviceResources,
}: IngressBackendPanelProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<IngressBackend>(clone(ingressBackend));
  const viewModel = refViewModel.current;

  const servicePortSelectItems: PortSelectItem[] = useMemo(() => {
    const selectItems: PortSelectItem[] = [];

    serviceResources.forEach(serviceResource => {
      const thisService = loadYaml(serviceResource.yaml) as Service;

      (thisService.spec.ports ?? []).forEach(port => {
        if ((port.protocol ?? 'TCP') === 'TCP') {
          selectItems.push({
            label: `${thisService.metadata.name}:${port.name || port.port} ${
              port.name ? `(port ${port.port})` : ''
            }`,
            value: `${thisService.metadata.name}:${port.port}`,
            servicePort: port,
            serviceName: serviceResource.name,
          });
        }
      });
    });

    return sortByLabel(selectItems) as PortSelectItem[];
  }, [serviceResources]);

  let selectedServicePort = useMemo(() => {
    let thisServicePort = '';

    if (ingressBackend.service) {
      const selectedService = serviceResources.find(
        r => r.name === ingressBackend.service?.name,
      );

      if (selectedService) {
        const backendPortName = ingressBackend.service?.port.name;
        const backendPortNumber = ingressBackend.service?.port.number;

        const selectedServicePorts: ServicePort[] =
          (loadYaml(selectedService.yaml) as Service).spec.ports ?? [];
        let selectedPort;

        if (backendPortName) {
          selectedPort = selectedServicePorts.find(
            p => p.name === backendPortName,
          );
        }
        if (backendPortNumber) {
          selectedPort = selectedServicePorts.find(
            p => p.port === backendPortNumber,
          );
        }

        if (selectedPort) {
          thisServicePort = `${selectedService.name}:${selectedPort.port}`;
        }
      }
    }

    return thisServicePort;
  }, [ingressBackend.service, serviceResources]);

  const valueUpdated = (): void => {
    const selected = servicePortSelectItems.find(
      i => i.value === selectedServicePort,
    );

    if (selected && selected.serviceName) {
      const portName = selected.servicePort?.name || undefined;
      const portNumber = selected.servicePort?.port;

      const updatedDefaultBackend = clone(viewModel);
      updatedDefaultBackend.service = {
        name: selected.serviceName,
        port: {
          name: portName,
          number: portName ? undefined : portNumber,
        },
      };

      onUpdate(updatedDefaultBackend);
    }
  };

  return (
    <Fragment>
      <div className={classes.multiControlRow}>
        <Select
          label="Backend"
          items={servicePortSelectItems}
          selected={selectedServicePort}
          onChange={value => {
            selectedServicePort = value;
            valueUpdated();
          }}
        />
      </div>
    </Fragment>
  );
};
