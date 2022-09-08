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
import React, { Fragment, useMemo, useRef } from 'react';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../../utils/selectItem';
import { Select } from '../../../../../Controls/Select';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';
import { RoleBindingSubjectView } from '../RoleBindingEditor';

type OnUpdatedSubject = (
  originalSubject: RoleBindingSubjectView,
  subject?: RoleBindingSubjectView,
) => void;

type SubjectEditorAccordionProps = {
  id: string;
  state: AccordionState;
  subject: RoleBindingSubjectView;
  onUpdatedSubject: OnUpdatedSubject;
  packageResources: PackageResource[];
};

type ViewModel = {
  kind: string;
  name: string;
  apiGroup?: string;
};

const kindSelectItems: SelectItem[] = [
  {
    label: 'Group',
    value: 'Group',
  },
  {
    label: 'Service Account',
    value: 'ServiceAccount',
  },
  {
    label: 'User',
    value: 'User',
  },
];

const subjectKindToApiGroup: Map<string, string | undefined> = new Map([
  ['Group', 'rbac.authorization.k8s.io'],
  ['ServiceAccount', undefined],
  ['User', 'rbac.authorization.k8s.io'],
]);

export const SubjectEditorAccordion = ({
  id,
  state,
  subject,
  onUpdatedSubject,
  packageResources,
}: SubjectEditorAccordionProps) => {
  const viewModel = useRef<ViewModel>({
    kind: subject.kind ?? '',
    name: subject.name ?? '',
    apiGroup: subject.apiGroup ?? '',
  });

  const serviceAccountResources = useMemo(
    () =>
      packageResources.filter(resource => resource.kind === 'ServiceAccount'),
    [packageResources],
  );

  const serviceAccountSelectItems: SelectItem[] = sortByLabel(
    serviceAccountResources.map(serviceAccount => ({
      label: serviceAccount.name,
      value: serviceAccount.name,
    })),
  );

  const subjectUpdated = (): void => {
    const updatedSubject: RoleBindingSubjectView = {
      ...subject,
      kind: viewModel.current.kind,
      name: viewModel.current.name,
      apiGroup: viewModel.current.apiGroup || undefined,
    };

    onUpdatedSubject(subject, updatedSubject);
  };

  const description = subject.kind
    ? `${subject.kind} ${subject.name}`
    : 'new subject';

  return (
    <EditorAccordion
      id={id}
      title="Subject"
      description={description}
      state={state}
    >
      <Fragment>
        <Select
          label="Kind"
          items={kindSelectItems}
          selected={viewModel.current.kind}
          onChange={kind => {
            viewModel.current.kind = kind;
            viewModel.current.apiGroup = subjectKindToApiGroup.get(kind);
            subjectUpdated();
          }}
        />

        {viewModel.current.kind === 'ServiceAccount' && (
          <Select
            label="Name"
            selected={viewModel.current.name}
            items={serviceAccountSelectItems}
            onChange={serviceAccountName => {
              viewModel.current.name = serviceAccountName;
              subjectUpdated();
            }}
          />
        )}

        {viewModel.current.kind !== 'ServiceAccount' && (
          <TextField
            label="Name"
            variant="outlined"
            value={viewModel.current.name}
            onChange={e => {
              viewModel.current.name = e.target.value;
              subjectUpdated();
            }}
            fullWidth
          />
        )}

        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => onUpdatedSubject(subject, undefined)}
        >
          Delete
        </Button>
      </Fragment>
    </EditorAccordion>
  );
};
