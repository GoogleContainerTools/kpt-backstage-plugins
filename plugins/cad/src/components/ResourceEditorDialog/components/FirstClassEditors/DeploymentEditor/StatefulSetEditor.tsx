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
  Container,
  PodSecurityContext,
  Volume,
} from '../../../../../types/Pod';
import {
  LabelSelector,
  StatefulSet,
  StatefulSetMetadata,
  StatefulSetUpdateStrategy,
} from '../../../../../types/StatefulSet';
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
import { PodDetailsEditorAccordion } from './components/PodDetailsEditorAccordion';
import { StatefulSetDetailsEditorAccordion } from './components/StatefulSetDetailsEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type StatefulSetEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: StatefulSetMetadata;
  selector: LabelSelector;
  replicas?: number;
  updateStrategy?: StatefulSetUpdateStrategy;
  podManagementPolicy?: string;
  minReadySeconds?: number;
  progressDeadlineSeconds?: number;
  revisionHistoryLimit?: number;
  serviceName: string;
  volumes: Volume[];
  serviceAccount?: string;
  securityContext?: PodSecurityContext;
  restartPolicy?: string;
  terminationGracePeriodSeconds?: number;
};

const getResourceState = (statefulSet: StatefulSet): State => {
  statefulSet.spec = statefulSet.spec || { replicas: 1 };

  const statefulSetSpec = statefulSet.spec;

  statefulSetSpec.selector = statefulSetSpec.selector || {
    matchLabels: { 'app.kubernetes.io/name': 'app' },
  };
  statefulSetSpec.template = statefulSetSpec.template || {};
  statefulSetSpec.template.metadata = statefulSet.spec.template.metadata || {};
  statefulSetSpec.template.spec = statefulSetSpec.template.spec || {
    containers: [{ name: 'main' }],
  };

  const templateSpec = statefulSet.spec.template.spec;

  return {
    metadata: statefulSet.metadata,
    selector: statefulSetSpec.selector,
    replicas: statefulSetSpec.replicas,
    updateStrategy: statefulSetSpec.updateStrategy,
    podManagementPolicy: statefulSetSpec.podManagementPolicy,
    minReadySeconds: statefulSetSpec.minReadySeconds,
    revisionHistoryLimit: statefulSetSpec.revisionHistoryLimit,
    serviceName: statefulSetSpec.serviceName ?? '',
    volumes: templateSpec.volumes ?? [],
    serviceAccount: templateSpec.serviceAccountName,
    securityContext: templateSpec.securityContext,
    restartPolicy: templateSpec.restartPolicy,
    terminationGracePeriodSeconds: templateSpec.terminationGracePeriodSeconds,
  };
};

export const StatefulSetEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: StatefulSetEditorProps) => {
  const resourceYaml = loadYaml(yaml) as StatefulSet;

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
    spec.updateStrategy = state.updateStrategy;
    spec.podManagementPolicy = state.podManagementPolicy;
    spec.minReadySeconds = state.minReadySeconds;
    spec.revisionHistoryLimit = state.revisionHistoryLimit;
    spec.serviceName = state.serviceName;
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

      <StatefulSetDetailsEditorAccordion
        id="stateful-set-details"
        state={[expanded, setExpanded]}
        value={state}
        onUpdate={updatedState => setState(s => ({ ...s, ...updatedState }))}
        packageResources={packageResources}
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
