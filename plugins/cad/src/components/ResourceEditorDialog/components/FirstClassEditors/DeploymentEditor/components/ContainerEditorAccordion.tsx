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

import { Button, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { clone } from 'lodash';
import React, { Fragment, useRef, useState } from 'react';
import {
  Container,
  ContainerPort,
  EnvFromSource,
  EnvVar,
  Volume,
  VolumeMount,
} from '../../../../../../types/Pod';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';
import { useEditorStyles } from '../../styles';
import { CommandArgsEditorAccordion } from './container/CommandArgsEditorAccordion';
import { EnvironmentEditorAccordion } from './container/EnviornmentEditorAccordion';
import { HealthEditorAccordion } from './container/HealthEditorAccordion';
import { ImageOptionsEditorAccordion } from './container/ImageOptionsEditorAccordion';
import { NetworkingEditorAccordion } from './container/NetworkingEditorAccordion';
import { ResourcesEditorAccordion } from './container/ResourcesEditorAccordion';
import { SecurityEditorAccordion } from './container/SecurityEditorAccordion';
import { StorageEditorAccordion } from './container/StorageEditorAccordion';

type OnUpdate = (container?: Container) => void;

type ContainerEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: Container;
  onUpdate: OnUpdate;
  volumes: Volume[];
  packageResources: PackageResource[];
};

const getDescription = (container: Container): string => {
  return `${container.name || ''} ${container.image || ''}`;
};

export const ContainerEditorAccordion = ({
  id,
  state,
  value: container,
  onUpdate,
  volumes,
  packageResources,
}: ContainerEditorAccordionProps) => {
  const [sectionExpanded, setSectionExpanded] = useState<string>();
  const refViewModel = useRef<Container>(clone(container));
  const viewModel = refViewModel.current;

  const refContainerPorts = useRef<ContainerPort[] | undefined>(
    viewModel.ports,
  );

  const refEnvVars = useRef<EnvVar[] | undefined>(viewModel.env);
  const refEnvFromSource = useRef<EnvFromSource[] | undefined>(
    viewModel.envFrom,
  );

  const refVolumeMounts = useRef<VolumeMount[] | undefined>(
    viewModel.volumeMounts,
  );

  const classes = useEditorStyles();

  const [image, tag] = (container.image ?? ':')?.split(':');

  const valueUpdated = (): void => {
    const updatedContainer = clone(viewModel);
    updatedContainer.ports = refContainerPorts.current;
    updatedContainer.volumeMounts = refVolumeMounts.current;
    updatedContainer.env = refEnvVars.current;
    updatedContainer.envFrom = refEnvFromSource.current;

    onUpdate(updatedContainer);
  };

  return (
    <EditorAccordion
      id={id}
      title="Container"
      description={getDescription(container)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <TextField
            label="Name"
            variant="outlined"
            value={viewModel.name}
            onChange={e => {
              viewModel.name = e.target.value;
              valueUpdated();
            }}
            fullWidth
          />

          <div className={classes.multiControlRow}>
            <TextField
              label="Image"
              variant="outlined"
              value={image}
              onChange={e => {
                viewModel.image = `${e.target.value}:${tag}`;
                valueUpdated();
              }}
              fullWidth
            />

            <TextField
              label="Tag"
              variant="outlined"
              value={tag}
              onChange={e => {
                viewModel.image = `${image}:${e.target.value}`;
                valueUpdated();
              }}
              fullWidth
            />
          </div>

          <div>
            <CommandArgsEditorAccordion
              id="command"
              state={[sectionExpanded, setSectionExpanded]}
              value={{ command: container.command, args: container.args }}
              onUpdate={updatedCommandArgs => {
                viewModel.command = updatedCommandArgs.command;
                viewModel.args = updatedCommandArgs.args;
                valueUpdated();
              }}
            />

            <EnvironmentEditorAccordion
              id="environment"
              state={[sectionExpanded, setSectionExpanded]}
              value={{ env: container.env, envFrom: container.envFrom }}
              onUpdate={updatedContainerEnv => {
                refEnvVars.current = updatedContainerEnv.env;
                refEnvFromSource.current = updatedContainerEnv.envFrom;
                valueUpdated();
              }}
              packageResources={packageResources}
            />

            <NetworkingEditorAccordion
              id="networking"
              state={[sectionExpanded, setSectionExpanded]}
              value={{ ports: container.ports }}
              onUpdate={({ ports }) => {
                refContainerPorts.current = ports;
                valueUpdated();
              }}
            />

            <StorageEditorAccordion
              id="storage"
              state={[sectionExpanded, setSectionExpanded]}
              value={{ volumeMounts: container.volumeMounts }}
              onUpdate={updatedStorage => {
                refVolumeMounts.current = updatedStorage.volumeMounts;
                valueUpdated();
              }}
              volumes={volumes}
            />

            <HealthEditorAccordion
              id="health"
              state={[sectionExpanded, setSectionExpanded]}
              value={{
                startupProbe: container.startupProbe,
                readinessProbe: container.readinessProbe,
                livenessProbe: container.livenessProbe,
              }}
              onUpdate={updatedValue => {
                viewModel.startupProbe = updatedValue.startupProbe;
                viewModel.readinessProbe = updatedValue.readinessProbe;
                viewModel.livenessProbe = updatedValue.livenessProbe;
                valueUpdated();
              }}
            />

            <ResourcesEditorAccordion
              id="resources"
              state={[sectionExpanded, setSectionExpanded]}
              value={container.resources ?? {}}
              onUpdate={updatedValue => {
                viewModel.resources = updatedValue;
                valueUpdated();
              }}
            />

            <ImageOptionsEditorAccordion
              id="image-options"
              state={[sectionExpanded, setSectionExpanded]}
              value={{
                imagePullPolicy: container.imagePullPolicy,
                imagePullSecrets: container.imagePullSecrets,
              }}
              onUpdate={updatedValue => {
                viewModel.imagePullPolicy = updatedValue.imagePullPolicy;
                viewModel.imagePullSecrets = updatedValue.imagePullSecrets;
                valueUpdated();
              }}
            />

            <SecurityEditorAccordion
              id="security"
              state={[sectionExpanded, setSectionExpanded]}
              value={{
                securityContext: viewModel.securityContext,
              }}
              onUpdate={securityState => {
                viewModel.securityContext = securityState.securityContext;
                valueUpdated();
              }}
            />
          </div>
        </Fragment>

        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => onUpdate(undefined)}
        >
          Delete Container
        </Button>
      </Fragment>
    </EditorAccordion>
  );
};
