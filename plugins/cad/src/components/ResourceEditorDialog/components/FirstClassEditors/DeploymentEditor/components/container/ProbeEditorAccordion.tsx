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
import { TextField } from '@material-ui/core';
import { clone } from 'lodash';
import React, { Fragment, useRef } from 'react';
import { Probe } from '../../../../../../../types/Pod';
import { buildSelectItemsFromList } from '../../../../../../../utils/selectItem';
import {
  getNumber,
  getNumberOrString,
} from '../../../../../../../utils/string';
import { Select } from '../../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../../Controls/EditorAccordion';
import { useEditorStyles } from '../../../styles';

type OnUpdate = (newValue: Probe) => void;

type ProbeEditorAccordionProps = {
  id: string;
  title: string;
  state: AccordionState;
  value: Probe;
  onUpdate: OnUpdate;
};

const SOURCE = ['http', 'exec', 'tcp'];

const sourceSelectItems: SelectItem[] = buildSelectItemsFromList(SOURCE, {
  labelFn: false,
});

const getProbeHandler = (probe: Probe): string => {
  if (probe.httpGet) {
    return 'http';
  } else if (probe.exec) {
    return 'exec';
  } else if (probe.tcpSocket) {
    return 'tcp';
  }

  return 'http';
};

const normalizeProbe = (probe: Probe, probeHandler: string): Probe => {
  if (probeHandler !== 'http') {
    probe.httpGet = undefined;
  }
  if (probeHandler !== 'exec') {
    probe.exec = undefined;
  }
  if (probeHandler !== 'tcp') {
    probe.tcpSocket = undefined;
  }

  return probe;
};

const getDescription = (probe: Probe, probeHandler: string): string => {
  if (probeHandler === 'http') return `http get ${probe.httpGet?.path || '?'}`;

  if (probeHandler === 'exec')
    return `exec ${probe.exec?.command?.join(' ') || '?'}`;

  if (probeHandler === 'tcp') return `tcp ${probe.tcpSocket?.port || '?'}`;

  return 'unknown';
};

export const ProbeEditorAccordion = ({
  id,
  title,
  state,
  value: probe,
  onUpdate,
}: ProbeEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef<Probe>(probe);
  const viewModel = refViewModel.current;

  const refProbeHandler = useRef<string>(getProbeHandler(probe));
  const probeHandler = refProbeHandler.current;

  const valueUpdated = (): void => {
    const updatedProbe = normalizeProbe(
      clone(viewModel),
      refProbeHandler.current,
    );

    onUpdate(updatedProbe);
  };

  return (
    <EditorAccordion
      id={id}
      title={title}
      description={getDescription(viewModel, probeHandler)}
      state={state}
    >
      <Fragment>
        <div className={classes.multiControlRow}>
          <Select
            label="Probe Handler"
            items={sourceSelectItems}
            selected={probeHandler}
            onChange={value => {
              refProbeHandler.current = value;
              valueUpdated();
            }}
          />

          {probeHandler === 'http' && (
            <Fragment>
              <TextField
                label="HTTP GET Path"
                variant="outlined"
                value={viewModel.httpGet?.path || ''}
                onChange={e => {
                  viewModel.httpGet = viewModel.httpGet || {
                    path: '',
                    port: '',
                  };
                  viewModel.httpGet.path = e.target.value;
                  valueUpdated();
                }}
                fullWidth
              />

              <TextField
                label="Port"
                variant="outlined"
                value={viewModel.httpGet?.port || ''}
                onChange={e => {
                  viewModel.httpGet = viewModel.httpGet || {
                    path: '',
                    port: '',
                  };
                  viewModel.httpGet.port =
                    getNumberOrString(e.target.value) ?? '';
                  valueUpdated();
                }}
                fullWidth
              />
            </Fragment>
          )}

          {probeHandler === 'exec' && (
            <Fragment>
              <TextField
                label="Exec Command"
                variant="outlined"
                value={viewModel.exec?.command || ''}
                onChange={e => {
                  viewModel.exec = viewModel.exec || { command: [] };
                  viewModel.exec.command = e.target.value.split(' ');
                  valueUpdated();
                }}
                fullWidth
              />
            </Fragment>
          )}

          {probeHandler === 'tcp' && (
            <Fragment>
              <TextField
                label="Port"
                variant="outlined"
                value={viewModel.tcpSocket?.port || ''}
                onChange={e => {
                  viewModel.tcpSocket = viewModel.tcpSocket || { port: '' };
                  viewModel.tcpSocket.port =
                    getNumberOrString(e.target.value) ?? '';
                  valueUpdated();
                }}
                fullWidth
              />
            </Fragment>
          )}
        </div>

        <div className={classes.multiControlRow}>
          <TextField
            label="Initial Delay Seconds"
            variant="outlined"
            value={viewModel.initialDelaySeconds ?? ''}
            onChange={e => {
              const value = e.target.value;

              viewModel.initialDelaySeconds = getNumber(value);
              valueUpdated();
            }}
            fullWidth
          />

          <TextField
            label="Period Seconds"
            variant="outlined"
            value={viewModel.periodSeconds ?? ''}
            onChange={e => {
              const value = e.target.value;

              viewModel.periodSeconds = getNumber(value);
              valueUpdated();
            }}
            fullWidth
          />

          <TextField
            label="Timeout Seconds"
            variant="outlined"
            value={viewModel.timeoutSeconds ?? ''}
            onChange={e => {
              const value = e.target.value;

              viewModel.timeoutSeconds = getNumber(value);
              valueUpdated();
            }}
            fullWidth
          />
        </div>

        <div className={classes.multiControlRow}>
          <TextField
            label="Success Threshold"
            variant="outlined"
            value={viewModel.successThreshold ?? ''}
            onChange={e => {
              const value = e.target.value;

              viewModel.successThreshold = getNumber(value);
              valueUpdated();
            }}
            fullWidth
          />

          <TextField
            label="Failure Threshold"
            variant="outlined"
            value={viewModel.failureThreshold ?? ''}
            onChange={e => {
              const value = e.target.value;

              viewModel.failureThreshold = getNumber(value);
              valueUpdated();
            }}
            fullWidth
          />

          <TextField
            label="Placeholder"
            variant="outlined"
            style={{ visibility: 'hidden' }}
            fullWidth
          />
        </div>
      </Fragment>
    </EditorAccordion>
  );
};
