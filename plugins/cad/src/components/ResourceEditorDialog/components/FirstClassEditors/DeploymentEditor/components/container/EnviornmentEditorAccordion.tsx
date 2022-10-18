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
import { EnvFromSource, EnvVar } from '../../../../../../../types/Pod';
import { PackageResource } from '../../../../../../../utils/packageRevisionResources';
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
import { EnvFromSourceEditorAccordion } from './EnvFromSourceEditorAccordion';
import { EnvVarEditorAccordion } from './EnvVarEditorAccordion';

type EnvState = {
  env?: EnvVar[];
  envFrom?: EnvFromSource[];
};

type OnUpdate = (newValue: EnvState) => void;

type EnvironmentEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value: EnvState;
  onUpdate: OnUpdate;
  packageResources: PackageResource[];
};

const getDescription = (envState: EnvState): string => {
  const envVarsCount = envState.env?.length || 0;
  const sourcesCount = envState.envFrom?.length || 0;

  const plural = (word: string, count: number) =>
    count === 1 ? word : `${word}s`;

  const statements = [
    `${envVarsCount} environment ${plural('variable', envVarsCount)}`,
  ];

  if (sourcesCount > 0) {
    statements.push(`${sourcesCount} ${plural('source', sourcesCount)}`);
  }

  return statements.join(' + ');
};

export const EnvironmentEditorAccordion = ({
  id,
  state,
  value: envState,
  onUpdate,
  packageResources,
}: EnvironmentEditorAccordionProps) => {
  const classes = useEditorStyles();
  const [sectionExpanded, setSectionExpanded] = useState<string>();

  const refEnvVars = useRef<Deletable<EnvVar>[]>(envState.env ?? []);
  const envVars = refEnvVars.current;

  const refEnvFromList = useRef<Deletable<EnvFromSource>[]>(
    envState.envFrom ?? [],
  );
  const envFromList = refEnvFromList.current;

  const envUpdated = (): void => {
    const updatedContainerEnv: EnvState = {
      env: undefinedIfEmpty(getActiveElements(envVars)),
      envFrom: undefinedIfEmpty(getActiveElements(envFromList)),
    };

    onUpdate(updatedContainerEnv);
  };

  return (
    <EditorAccordion
      id={id}
      title="Environment"
      description={getDescription(envState)}
      state={state}
    >
      <Fragment>
        <div>
          {envVars.map(
            (envVar, index) =>
              isActiveElement(envVar) && (
                <EnvVarEditorAccordion
                  key={`env-${index}`}
                  id={`env-${index}`}
                  state={[sectionExpanded, setSectionExpanded]}
                  value={envVar}
                  onUpdate={updatedEnvVar => {
                    updateList(envVars, updatedEnvVar, index);
                    envUpdated();
                  }}
                  packageResources={packageResources}
                />
              ),
          )}
        </div>

        <div>
          {envFromList.map(
            (envFrom, index) =>
              isActiveElement(envFrom) && (
                <EnvFromSourceEditorAccordion
                  key={`env-from-${index}`}
                  id={`env-from-${index}`}
                  state={[sectionExpanded, setSectionExpanded]}
                  value={envFrom}
                  onUpdate={updatedEnvFrom => {
                    updateList(envFromList, updatedEnvFrom, index);
                    envUpdated();
                  }}
                  packageResources={packageResources}
                />
              ),
          )}
        </div>

        <div className={classes.buttonRow}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              envVars.push({ name: '' });
              envUpdated();
              setSectionExpanded(`env-${envVars.length - 1}`);
            }}
          >
            Add Env Variable
          </Button>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              envFromList.push({});
              envUpdated();
              setSectionExpanded(`env-from-${envFromList.length - 1}`);
            }}
          >
            Add Env From
          </Button>
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
