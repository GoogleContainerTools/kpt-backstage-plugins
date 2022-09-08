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
import DeleteIcon from '@material-ui/icons/Delete';
import { clone, isNaN } from 'lodash';
import React, { Fragment, useRef } from 'react';
import { ContainerPort, PodTemplateSpec } from '../../../../../../types/Pod';
import { Select } from '../../../../../Controls/Select';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';
import { useEditorStyles } from '../../styles';
import { ServicePortView } from '../ServiceEditor';

type OnUpdatedServicePort = (
  originalServicePort: ServicePortView,
  servicePort?: ServicePortView,
) => void;

type ServicePortEditorAccordionProps = {
  id: string;
  state: AccordionState;
  servicePort: ServicePortView;
  onUpdatedServicePort: OnUpdatedServicePort;
  targetPodTemplateSpec: PodTemplateSpec;
  serviceType: string;
};

type TargetPortSelectItem = SelectItem & {
  portNumber: number;
  portName?: string;
  protocol?: string;
};

export const ServicePortEditorAccordion = ({
  id,
  state,
  servicePort,
  onUpdatedServicePort,
  targetPodTemplateSpec,
  serviceType,
}: ServicePortEditorAccordionProps) => {
  const viewModel = useRef<ServicePortView>(clone(servicePort));
  const classes = useEditorStyles();

  const isNodePortRelevant =
    serviceType === 'NodePort' || serviceType === 'LoadBalancer';

  const podPortSelectItems: TargetPortSelectItem[] = [];
  const getProtocol = (protocol?: string): string => protocol || 'TCP';
  const getPortDescription = (port: ContainerPort): string => {
    const namePrefix = port.name ? `${port.name}: ` : '';
    const portDescription = `${getProtocol(port.protocol)} ${
      port.containerPort
    }`;

    return `${namePrefix}${portDescription}`;
  };

  targetPodTemplateSpec.spec.containers.forEach(container =>
    container.ports?.forEach(port => {
      podPortSelectItems.push({
        label: getPortDescription(port),
        value: `${port.protocol ?? 'TCP'}${port.containerPort}`,
        portName: port.name,
        portNumber: port.containerPort,
        protocol: port.protocol,
      });
    }),
  );

  const toNumber = (strNumber: string): number | undefined =>
    !isNaN(strNumber) ? parseInt(strNumber, 10) : undefined;

  const servicePortUpdated = (): void => {
    const updatedServicePort = clone(viewModel.current);
    onUpdatedServicePort(servicePort, updatedServicePort);
  };

  const targetPort = viewModel.current.targetPort ?? viewModel.current.port;
  const targetProtocol = getProtocol(viewModel.current.protocol);
  let selectedPortValue = '';

  if (targetPort) {
    const selectItem = podPortSelectItems.find(
      podPort =>
        (getProtocol(podPort.protocol) === targetProtocol &&
          podPort.portNumber === targetPort) ||
        podPort.portName === targetPort,
    );

    if (selectItem) {
      selectedPortValue = selectItem.value as string;
    }
  }

  const getDescription = (): string => {
    if (!targetPort) return 'New';

    const namePrefix = viewModel.current.name
      ? `${viewModel.current.name}: `
      : '';
    const incomingPort = `${targetProtocol} ${viewModel.current.port}`;
    const nodePort =
      isNodePortRelevant && viewModel.current.nodePort
        ? ` / node ${viewModel.current.nodePort}`
        : '';

    return `${namePrefix}${incomingPort}${nodePort} → ${targetPort}`;
  };

  return (
    <EditorAccordion
      id={id}
      title="Service Port"
      description={getDescription()}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div className={classes.multiControlRow}>
            <TextField
              label="Name"
              variant="outlined"
              value={viewModel.current.name}
              onChange={e => {
                viewModel.current.name = e.target.value;
                servicePortUpdated();
              }}
              fullWidth
            />

            {isNodePortRelevant && (
              <TextField
                label="Node Port"
                variant="outlined"
                value={viewModel.current.nodePort}
                onChange={e => {
                  viewModel.current.nodePort = toNumber(e.target.value);
                  servicePortUpdated();
                }}
                fullWidth
              />
            )}
          </div>

          <div className={classes.multiControlRow}>
            <TextField
              label="Exposed Port"
              variant="outlined"
              value={viewModel.current.port}
              onChange={e => {
                const value = e.target.value;
                viewModel.current.port = toNumber(value);

                if (!viewModel.current.targetPort) {
                  const podPortItemMatch = podPortSelectItems.find(
                    item => item.portNumber === viewModel.current.port,
                  );

                  if (podPortItemMatch) {
                    viewModel.current.protocol = podPortItemMatch.protocol;
                    viewModel.current.targetPort =
                      podPortItemMatch.portName ?? viewModel.current.port;
                  }
                }

                servicePortUpdated();
              }}
              fullWidth
            />

            <Select
              label="Target Port"
              items={podPortSelectItems}
              selected={selectedPortValue}
              onChange={value => {
                const selectedTargetPort = podPortSelectItems.find(
                  item => item.value === value,
                );

                if (selectedTargetPort) {
                  viewModel.current.protocol = selectedTargetPort.protocol;
                  viewModel.current.targetPort =
                    selectedTargetPort.portName ??
                    toNumber(selectedTargetPort.portNumber as any as string);
                  servicePortUpdated();
                }
              }}
            />
          </div>
        </Fragment>
        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => onUpdatedServicePort(servicePort, undefined)}
        >
          Delete
        </Button>
      </Fragment>
    </EditorAccordion>
  );
};
