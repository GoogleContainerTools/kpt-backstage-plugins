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
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import { clone } from 'lodash';
import React, { ChangeEvent, Fragment, useRef, useState } from 'react';
import { HTTPIngressPath, IngressRule } from '../../../../../../types/Ingress';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import {
  EditorAccordion,
  OnAccordionChange,
} from '../../Controls/EditorAccordion';
import { useEditorStyles } from '../../styles';
import { HTTPPathRuleEditorAccordion } from './HTTPPathRuleEditorAccordion';

type OnUpdate = (newValue?: IngressRule) => void;

type IngressRuleEditorAccordionProps = {
  expanded: boolean;
  onChange: OnAccordionChange;
  value: IngressRule;
  onUpdate: OnUpdate;
  serviceResources: PackageResource[];
};

const updateList = <T,>(
  list: T[],
  newValue: T | undefined,
  idx: number,
): T[] => {
  list[idx] = newValue || { ...list[idx], _isDeleted: true };
  return list;
};

export const IngressRuleEditorAccordion = ({
  expanded: thisExpanded,
  onChange,
  value: ingressRule,
  onUpdate,
  serviceResources,
}: IngressRuleEditorAccordionProps) => {
  const classes = useEditorStyles();

  const refViewModel = useRef(clone(ingressRule));
  const viewModel = refViewModel.current;

  const [expanded, setExpanded] = useState<string>();

  const refPathsModel = useRef<(HTTPIngressPath & { _isDeleted?: boolean })[]>(
    clone(ingressRule.http?.paths || []),
  );
  const pathsModel = refPathsModel.current;

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  const valueUpdated = (): void => {
    viewModel.http = viewModel.http ?? { paths: [] };
    viewModel.http.paths = pathsModel.filter(path => !path._isDeleted);

    const updatedValue = clone(viewModel);
    onUpdate(updatedValue);
  };

  const descriptionPrefix = viewModel.host ? `${viewModel.host} ` : '';
  const description = `${descriptionPrefix} ${viewModel.http?.paths
    .map(p => p.path)
    .join(' ')}`;

  return (
    <EditorAccordion
      title="Rule"
      description={description}
      expanded={thisExpanded}
      onChange={onChange}
    >
      <Fragment>
        <Fragment>
          <TextField
            label="Host"
            variant="outlined"
            value={viewModel.host ?? ''}
            onChange={e => {
              viewModel.host = e.target.value || undefined;
              valueUpdated();
            }}
            fullWidth
          />

          <div>
            {pathsModel.map(
              (httpPath, index) =>
                !httpPath._isDeleted && (
                  <HTTPPathRuleEditorAccordion
                    key={`path-${index}`}
                    expanded={expanded === `path-${index}`}
                    onChange={handleChange(`path-${index}`)}
                    value={httpPath}
                    onUpdate={updatedPath => {
                      refPathsModel.current = updateList(
                        pathsModel,
                        updatedPath,
                        index,
                      );
                      valueUpdated();
                    }}
                    serviceResources={serviceResources}
                  />
                ),
            )}
          </div>

          <div className={classes.buttonRow}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                pathsModel.push({ pathType: '', backend: {} });
                setExpanded(`path-${viewModel.http?.paths.length}`);
                valueUpdated();
              }}
            >
              Add Path
            </Button>
          </div>

          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => {
              onUpdate(undefined);
            }}
          >
            Delete
          </Button>
        </Fragment>
      </Fragment>
    </EditorAccordion>
  );
};
