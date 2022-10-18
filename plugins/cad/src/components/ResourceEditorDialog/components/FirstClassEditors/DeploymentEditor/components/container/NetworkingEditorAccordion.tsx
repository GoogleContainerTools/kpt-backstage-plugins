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
import React, { Fragment, useRef, useState } from 'react';
import { ContainerPort } from '../../../../../../../types/Pod';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  undefinedIfEmpty,
  updateList,
} from '../../../util/deletable';
import { ContainerPortEditorAccordion } from './ContainerPortEditorAccordion';

type NetworkingState = {
  ports?: ContainerPort[];
};

type OnUpdate = (newValue: NetworkingState) => void;

type NetworkingEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: NetworkingState;
  onUpdate: OnUpdate;
};

const getDescription = (networkingState: NetworkingState): string => {
  const portsCount = networkingState.ports?.length || 0;

  return `${portsCount} exposed ${portsCount === 1 ? 'port' : 'ports'}`;
};

export const NetworkingEditorAccordion = ({
  id,
  state,
  value: networkingState,
  onUpdate,
}: NetworkingEditorAccordionProps) => {
  const classes = useEditorStyles();
  const [sectionExpanded, setSectionExpanded] = useState<string>();

  const refContainerPorts = useRef<Deletable<ContainerPort>[]>(
    networkingState.ports ?? [],
  );
  const containerPorts = refContainerPorts.current;

  const valueUpdated = (): void => {
    const updatedNetworkingState: NetworkingState = {
      ports: undefinedIfEmpty(getActiveElements(refContainerPorts.current)),
    };

    onUpdate(updatedNetworkingState);
  };

  return (
    <EditorAccordion
      id={id}
      title="Networking"
      description={getDescription(networkingState)}
      state={state}
    >
      <Fragment>
        <Fragment>
          <div>
            {containerPorts.map(
              (containerPort, index) =>
                isActiveElement(containerPort) && (
                  <ContainerPortEditorAccordion
                    key={`port-${index}`}
                    id={`port-${index}`}
                    state={[sectionExpanded, setSectionExpanded]}
                    value={containerPort}
                    onUpdate={updatedPort => {
                      updateList(containerPorts, updatedPort, index);
                      valueUpdated();
                    }}
                  />
                ),
            )}
          </div>
        </Fragment>

        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              containerPorts.push({ name: 'service' } as ContainerPort);
              setSectionExpanded(`port-${containerPorts.length - 1}`);
            }}
          >
            Add Port
          </Button>
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
