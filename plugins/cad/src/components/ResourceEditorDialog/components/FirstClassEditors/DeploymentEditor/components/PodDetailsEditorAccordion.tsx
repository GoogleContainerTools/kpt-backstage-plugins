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

import { clone } from 'lodash';
import React, { Fragment, useRef, useState } from 'react';
import { PodSecurityContext, Volume } from '../../../../../../types/Pod';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';
import { LifecycleEditorAccordion } from './pod/LifecycleEditorAccordion';
import { SecurityEditorAccordion } from './pod/SecurityEditorAccordion';
import { StorageEditorAccordion } from './pod/StorageEditorAccordion';

type PodState = {
  volumes?: Volume[];
  serviceAccount?: string;
  securityContext?: PodSecurityContext;
  restartPolicy?: string;
  terminationGracePeriodSeconds?: number;
};

type OnUpdate = (newValue: PodState) => void;

type PodDetailsEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: PodState;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

export type VolumeView = Volume & {
  key: number;
};

const getDescription = (pod: PodState): string => {
  const volumeCount = pod.volumes?.length || 0;

  const statements: string[] = [
    `${pod.serviceAccount ?? 'default'} service account`,
    `${volumeCount} ${volumeCount === 1 ? 'volume' : 'volumes'}`,
  ];

  return statements.join(', ');
};

export const PodDetailsEditorAccordion = ({
  id,
  state,
  value: podState,
  onUpdate,
  packageResources,
}: PodDetailsEditorAccordionProps) => {
  const [sectionExpanded, setSectionExpanded] = useState<string>();
  const refViewModel = useRef<PodState>(clone(podState));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    onUpdate(viewModel);
  };

  return (
    <EditorAccordion
      id={id}
      title="Pod Details"
      description={getDescription(podState)}
      state={state}
    >
      <Fragment>
        <div>
          <StorageEditorAccordion
            id="volumes"
            state={[sectionExpanded, setSectionExpanded]}
            value={{ volumes: viewModel.volumes }}
            onUpdate={storageState => {
              viewModel.volumes = storageState.volumes;
              valueUpdated();
            }}
            packageResources={packageResources}
          />
          <SecurityEditorAccordion
            id="security"
            state={[sectionExpanded, setSectionExpanded]}
            value={{
              serviceAccount: viewModel.serviceAccount,
              securityContext: viewModel.securityContext,
            }}
            onUpdate={securityState => {
              viewModel.serviceAccount = securityState.serviceAccount;
              viewModel.securityContext = securityState.securityContext;
              valueUpdated();
            }}
            packageResources={packageResources}
          />
          <LifecycleEditorAccordion
            id="lifecycle"
            state={[sectionExpanded, setSectionExpanded]}
            value={{
              restartPolicy: viewModel.restartPolicy,
              terminationGracePeriodSeconds:
                viewModel.terminationGracePeriodSeconds,
            }}
            onUpdate={updatedLifecycle => {
              viewModel.restartPolicy = updatedLifecycle.restartPolicy;
              viewModel.terminationGracePeriodSeconds =
                updatedLifecycle.terminationGracePeriodSeconds;
              valueUpdated();
            }}
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
