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

import { cloneDeep } from 'lodash';
import React, { useRef, useState } from 'react';
import { Probe } from '../../../../../../../types/Pod';
import { Checkbox } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';
import { ProbeEditorAccordion } from './ProbeEditorAccordion';

type HealthState = {
  startupProbe?: Probe;
  readinessProbe?: Probe;
  livenessProbe?: Probe;
};

type UseHealthState = {
  useStartupProbe: boolean;
  useReadinessProbe: boolean;
  useLivenessProbe: boolean;
};

type OnUpdate = (newValue: HealthState) => void;

type HealthEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: HealthState;
  onUpdate: OnUpdate;
};

const getUseHealthState = (healthState: HealthState): UseHealthState => {
  return {
    useStartupProbe: !!healthState.startupProbe,
    useReadinessProbe: !!healthState.readinessProbe,
    useLivenessProbe: !!healthState.livenessProbe,
  };
};

const nomralizeHealthState = (
  healthState: HealthState,
  state: UseHealthState,
): HealthState => {
  if (!state.useStartupProbe) {
    healthState.startupProbe = undefined;
  }

  if (!state.useReadinessProbe) {
    healthState.readinessProbe = undefined;
  }

  if (!state.useLivenessProbe) {
    healthState.livenessProbe = undefined;
  }

  return healthState;
};

const getDescription = (state: UseHealthState): string => {
  const probesEnabled = [];

  if (state.useStartupProbe) probesEnabled.push('startup probe');
  if (state.useReadinessProbe) probesEnabled.push('readiness probe');
  if (state.useLivenessProbe) probesEnabled.push('liveness probe');

  return probesEnabled.length > 0 ? probesEnabled.join(', ') : 'no probes';
};

export const HealthEditorAccordion = ({
  id,
  state,
  value: healthState,
  onUpdate,
}: HealthEditorAccordionProps) => {
  const classes = useEditorStyles();

  const [sectionExpanded, setSectionExpanded] = useState<string>();
  const [useHealthState, setUseHealthState] = useState<UseHealthState>(
    getUseHealthState(healthState),
  );

  const refViewModel = useRef<HealthState>(cloneDeep(healthState));
  const viewModel = refViewModel.current;

  const valueUpdated = (): void => {
    const thisHealthState = nomralizeHealthState(
      cloneDeep(refViewModel.current),
      useHealthState,
    );

    onUpdate(thisHealthState);
  };

  return (
    <EditorAccordion
      id={id}
      title="Health"
      description={getDescription(useHealthState)}
      state={state}
    >
      <div className={classes.multiControlRow}>
        <Checkbox
          label="Startup probe"
          checked={useHealthState.useStartupProbe}
          onChange={checked => {
            setUseHealthState(s => ({ ...s, useStartupProbe: checked }));
            valueUpdated();
          }}
        />
        <Checkbox
          label="Readiness probe"
          checked={useHealthState.useReadinessProbe}
          onChange={checked => {
            setUseHealthState(s => ({ ...s, useReadinessProbe: checked }));
            valueUpdated();
          }}
        />
        <Checkbox
          label="Liveness probe"
          checked={useHealthState.useLivenessProbe}
          onChange={checked => {
            setUseHealthState(s => ({ ...s, useLivenessProbe: checked }));
            valueUpdated();
          }}
        />
      </div>

      <div>
        {useHealthState.useStartupProbe && (
          <ProbeEditorAccordion
            id="startup"
            title="Startup Probe"
            state={[sectionExpanded, setSectionExpanded]}
            value={viewModel.startupProbe || {}}
            onUpdate={updatedProbe => {
              refViewModel.current.startupProbe = updatedProbe;
              valueUpdated();
            }}
          />
        )}

        {useHealthState.useReadinessProbe && (
          <ProbeEditorAccordion
            id="readiness"
            title="Readiness Probe"
            state={[sectionExpanded, setSectionExpanded]}
            value={viewModel.readinessProbe || {}}
            onUpdate={updatedProbe => {
              refViewModel.current.readinessProbe = updatedProbe;
              valueUpdated();
            }}
          />
        )}

        {useHealthState.useLivenessProbe && (
          <ProbeEditorAccordion
            id="liveness"
            title="Liveness Probe"
            state={[sectionExpanded, setSectionExpanded]}
            value={viewModel.livenessProbe || {}}
            onUpdate={updatedProbe => {
              refViewModel.current.livenessProbe = updatedProbe;
              valueUpdated();
            }}
          />
        )}
      </div>
    </EditorAccordion>
  );
};
