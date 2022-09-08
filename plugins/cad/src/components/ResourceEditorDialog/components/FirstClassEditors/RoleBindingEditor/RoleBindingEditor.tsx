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
import AddIcon from '@material-ui/icons/Add';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import {
  RoleBinding,
  RoleBindingMetadata,
  RoleBindingSubject,
} from '../../../../../types/RoleBinding';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../utils/selectItem';
import { dumpYaml, loadYaml } from '../../../../../utils/yaml';
import { Select } from '../../../../Controls/Select';
import { EditorAccordion, ResourceMetadataAccordion } from '../Controls';
import { useEditorStyles } from '../styles';
import {
  Deletable,
  getActiveElements,
  isActiveElement,
  updateList,
} from '../util/deletable';
import { SubjectEditorAccordion } from './components/SubjectEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type RoleBindingEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  metadata: RoleBindingMetadata;
  roleRefKind: string;
  roleRefName: string;
  roleRefApiGroup: string;
  subjects: Deletable<RoleBindingSubject>[];
};

export const RoleBindingEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: RoleBindingEditorProps) => {
  const resourceYaml = loadYaml(yaml) as RoleBinding;

  const roleResources = useMemo(
    () => packageResources.filter(resource => resource.kind === 'Role'),
    [packageResources],
  );

  const roleSelectItems: SelectItem[] = sortByLabel(
    roleResources.map(role => ({
      label: role.name,
      value: role.name,
    })),
  );

  const createResourceState = (): State => ({
    metadata: resourceYaml.metadata,
    roleRefKind: resourceYaml.roleRef?.kind ?? '',
    roleRefName: resourceYaml.roleRef?.name ?? '',
    roleRefApiGroup: resourceYaml.roleRef?.apiGroup ?? '',
    subjects: resourceYaml.subjects ?? [],
  });

  const [state, setState] = useState<State>(createResourceState());
  const [expanded, setExpanded] = useState<string>();

  const roleRefKindSelectItems: SelectItem[] = [
    {
      label: 'Cluster Role',
      value: 'ClusterRole',
    },
    {
      label: 'Role',
      value: 'Role',
    },
  ];

  const classes = useEditorStyles();

  useEffect(() => {
    resourceYaml.metadata = state.metadata;
    resourceYaml.roleRef = {
      ...resourceYaml.roleRef,
      kind: state.roleRefKind,
      name: state.roleRefName,
      apiGroup: state.roleRefApiGroup,
    };
    resourceYaml.subjects = getActiveElements(state.subjects);

    onUpdatedYaml(dumpYaml(resourceYaml));
  }, [state, onUpdatedYaml, resourceYaml]);

  const getRoleRefDescription = (): string => {
    return state.roleRefKind
      ? `${state.roleRefKind} ${state.roleRefName}`
      : 'new';
  };

  return (
    <div className={classes.root}>
      <ResourceMetadataAccordion
        id="metadata"
        state={[expanded, setExpanded]}
        value={state.metadata}
        onUpdate={metadata => setState(s => ({ ...s, metadata }))}
      />

      <EditorAccordion
        id="role-reference"
        title="Role Reference"
        description={getRoleRefDescription()}
        state={[expanded, setExpanded]}
      >
        <Fragment>
          <Select
            label="Kind"
            items={roleRefKindSelectItems}
            selected={state.roleRefKind}
            onChange={kind =>
              setState(s => ({
                ...s,
                roleRefKind: kind,
                roleRefApiGroup: 'rbac.authorization.k8s.io',
              }))
            }
          />

          {state.roleRefKind === 'ClusterRole' && (
            <TextField
              label="Name"
              variant="outlined"
              value={state.roleRefName}
              onChange={e =>
                setState(s => ({ ...s, roleRefName: e.target.value }))
              }
              fullWidth
            />
          )}

          {state.roleRefKind === 'Role' && (
            <Select
              label="Name"
              selected={state.roleRefName}
              items={roleSelectItems}
              onChange={roleName =>
                setState(s => ({ ...s, roleRefName: roleName }))
              }
            />
          )}
        </Fragment>
      </EditorAccordion>

      {state.subjects.map(
        (subject, index) =>
          isActiveElement(subject) && (
            <SubjectEditorAccordion
              id={`subject-${index}`}
              key={`subject-${index}`}
              state={[expanded, setExpanded]}
              value={subject}
              onUpdate={updatedSubject =>
                setState(s => ({
                  ...s,
                  subjects: updateList(
                    s.subjects.slice(),
                    updatedSubject,
                    index,
                  ),
                }))
              }
              packageResources={packageResources}
            />
          ),
      )}

      <div className={classes.buttonRow}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setState(s => ({
              ...s,
              subjects: [...s.subjects, { kind: '', name: '' }],
            }));
            setExpanded(`subject-${state.subjects.length}`);
          }}
        >
          Add Subject
        </Button>
      </div>
    </div>
  );
};
