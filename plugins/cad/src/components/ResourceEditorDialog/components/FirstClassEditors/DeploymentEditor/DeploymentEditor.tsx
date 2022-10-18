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
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import {
  Deployment,
  DeploymentMetadata,
  DeploymentStrategy,
  LabelSelector,
} from '../../../../../types/Deployment';
import {
  Container,
  PodSecurityContext,
  Volume,
} from '../../../../../types/Pod';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { ResourceMetadataAccordion } from '../Controls/ResourceMetadataAccordion';
import { useEditorStyles } from '../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  updateList,
} from '../util/deletable';
import { ContainerEditorAccordion } from './components/ContainerEditorAccordion';
import { DeploymentDetailsEditorAccordion } from './components/DeploymentDetailsEditorAccordion';
import { PodDetailsEditorAccordion } from './components/PodDetailsEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type DeploymentEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: DeploymentMetadata;
  selector: LabelSelector;
  replicas?: number;
  strategy?: DeploymentStrategy;
  minReadySeconds?: number;
  progressDeadlineSeconds?: number;
  revisionHistoryLimit?: number;
  volumes: Volume[];
  serviceAccount?: string;
  securityContext?: PodSecurityContext;
  restartPolicy?: string;
  terminationGracePeriodSeconds?: number;
};

const getResourceState = (deployment: Deployment): State => {
  deployment.spec = deployment.spec || { replicas: 1 };

  const deploymentSpec = deployment.spec;

  deploymentSpec.selector = deploymentSpec.selector || {
    matchLabels: { 'app.kubernetes.io/name': 'app' },
  };
  deploymentSpec.template = deploymentSpec.template || {};
  deploymentSpec.template.metadata = deployment.spec.template.metadata || {};
  deploymentSpec.template.spec = deploymentSpec.template.spec || {
    containers: [{ name: 'main' }],
  };

  const templateSpec = deployment.spec.template.spec;

  return {
    metadata: deployment.metadata,
    selector: deploymentSpec.selector,
    replicas: deploymentSpec.replicas,
    strategy: deploymentSpec.strategy,
    minReadySeconds: deploymentSpec.minReadySeconds,
    progressDeadlineSeconds: deploymentSpec.progressDeadlineSeconds,
    revisionHistoryLimit: deploymentSpec.revisionHistoryLimit,
    volumes: templateSpec.volumes ?? [],
    serviceAccount: templateSpec.serviceAccountName,
    securityContext: templateSpec.securityContext,
    restartPolicy: templateSpec.restartPolicy,
    terminationGracePeriodSeconds: templateSpec.terminationGracePeriodSeconds,
  };
};

export const DeploymentEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: DeploymentEditorProps) => {
  const resourceYaml = loadYaml(yaml) as Deployment;

  const classes = useEditorStyles();

  const [state, setState] = useState<State>(getResourceState(resourceYaml));
  const [expanded, setExpanded] = useState<string>();
  const [containers, setContainers] = useState<Deletable<Container>[]>(
    resourceYaml.spec.template.spec.containers ?? [],
  );

  useEffect(() => {
    resourceYaml.metadata = state.metadata;

    const spec = resourceYaml.spec;
    spec.replicas = state.replicas;
    spec.strategy = state.strategy;
    spec.minReadySeconds = state.minReadySeconds;
    spec.progressDeadlineSeconds = state.progressDeadlineSeconds;
    spec.revisionHistoryLimit = state.revisionHistoryLimit;
    spec.selector = cloneDeep(state.selector);

    const templateSpec = spec.template.spec;
    spec.template.metadata.labels = cloneDeep(state.selector.matchLabels);
    templateSpec.containers = getActiveElements(containers);
    templateSpec.volumes = state.volumes.length > 0 ? state.volumes : undefined;
    templateSpec.serviceAccountName = state.serviceAccount;
    templateSpec.securityContext = state.securityContext;
    templateSpec.restartPolicy = state.restartPolicy;
    templateSpec.terminationGracePeriodSeconds =
      state.terminationGracePeriodSeconds;

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, onUpdatedYaml, resourceYaml, containers]);

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        id="metadata"
        state={[expanded, setExpanded]}
        value={state.metadata}
        onUpdate={metadata => setState(s => ({ ...s, metadata }))}
      />

      <DeploymentDetailsEditorAccordion
        id="deployment-details"
        state={[expanded, setExpanded]}
        value={state}
        onUpdate={updatedState => setState(s => ({ ...s, ...updatedState }))}
      />

      <PodDetailsEditorAccordion
        id="pod-details"
        state={[expanded, setExpanded]}
        value={state}
        onUpdate={updatedState => setState(s => ({ ...s, ...updatedState }))}
        packageResources={packageResources}
      />

      {containers.map(
        (thisContainer, index) =>
          isActiveElement(thisContainer) && (
            <ContainerEditorAccordion
              id={`container-${index}`}
              key={`container-${index}`}
              state={[expanded, setExpanded]}
              value={thisContainer}
              volumes={state.volumes}
              packageResources={packageResources}
              onUpdate={updatedContainer => {
                setContainers(
                  updateList(containers.slice(), updatedContainer, index),
                );
              }}
            />
          ),
      )}

      <div className={classes.buttonRow}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setContainers([...containers, { name: '' }]);
            setExpanded(`container-${containers.length}`);
          }}
        >
          Add Container
        </Button>
      </div>
    </div>
  );
};
