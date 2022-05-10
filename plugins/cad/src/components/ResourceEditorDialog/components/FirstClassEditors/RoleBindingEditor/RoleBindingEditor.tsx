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
import { dump, load } from 'js-yaml';
import { last, omit } from 'lodash';
import React, {
  ChangeEvent,
  Fragment,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import {
  RoleBinding,
  RoleBindingSubject,
} from '../../../../../types/RoleBinding';
import { PackageResource } from '../../../../../utils/packageRevisionResources';
import { sortByLabel } from '../../../../../utils/selectItem';
import { Select } from '../../../../Controls/Select';
import { EditorAccordion } from '../Controls/EditorAccordion';
import { KeyValueEditorAccordion } from '../Controls/KeyValueEditorAccordion';
import { SingleTextFieldAccordion } from '../Controls/SingleTextFieldAccordion';
import { useEditorStyles } from '../styles';
import { SubjectEditorAccordion } from './components/SubjectEditorAccordion';

type OnUpdatedYamlFn = (yaml: string) => void;

type RoleBindingEditorProps = {
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  packageResources: PackageResource[];
};

type State = {
  name: string;
  namespace: string;
  annotations: KubernetesKeyValueObject;
  labels: KubernetesKeyValueObject;
  roleRefKind: string;
  roleRefName: string;
  roleRefApiGroup: string;
};

export type RoleBindingSubjectView = RoleBindingSubject & {
  key: number;
};

export const RoleBindingEditor = ({
  yaml,
  onUpdatedYaml,
  packageResources,
}: RoleBindingEditorProps) => {
  const resourceYaml = load(yaml) as RoleBinding;

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
    name: resourceYaml.metadata.name,
    annotations: resourceYaml.metadata.annotations ?? {},
    labels: resourceYaml.metadata.labels ?? {},
    namespace: resourceYaml.metadata.namespace ?? '',
    roleRefKind: resourceYaml.roleRef?.kind ?? '',
    roleRefName: resourceYaml.roleRef?.name ?? '',
    roleRefApiGroup: resourceYaml.roleRef?.apiGroup ?? '',
  });

  const mapSubjectToView = (
    subject: RoleBindingSubject,
    idx: number,
  ): RoleBindingSubjectView => ({
    key: idx,
    ...subject,
  });

  const [state, setState] = useState<State>(createResourceState());
  const [subjects, setSubjects] = useState<RoleBindingSubjectView[]>(
    (resourceYaml.subjects ?? []).map(mapSubjectToView),
  );
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

  const handleChange =
    (panel: string) => (_: ChangeEvent<{}>, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : undefined);
    };

  useEffect(() => {
    const mapToSubject = (
      subjectView: RoleBindingSubjectView,
    ): RoleBindingSubject => omit(subjectView, 'key');

    resourceYaml.metadata.name = state.name;
    resourceYaml.metadata.namespace = state.namespace || undefined;
    resourceYaml.metadata.labels = state.labels;
    resourceYaml.metadata.annotations = state.annotations;
    resourceYaml.roleRef = {
      ...resourceYaml.roleRef,
      kind: state.roleRefKind,
      name: state.roleRefName,
      apiGroup: state.roleRefApiGroup,
    };
    resourceYaml.subjects = subjects.map(mapToSubject);

    if (state.annotations && Object.keys(state.annotations).length === 0) {
      delete resourceYaml.metadata.annotations;
    }
    if (state.labels && Object.keys(state.labels).length === 0) {
      delete resourceYaml.metadata.labels;
    }

    onUpdatedYaml(dump(resourceYaml));
  }, [state, subjects, onUpdatedYaml, resourceYaml]);

  const onSubjectUpdated = (
    currentSubject: RoleBindingSubjectView,
    updatedSubject?: RoleBindingSubjectView,
  ) => {
    const idx = subjects.indexOf(currentSubject);
    const list = subjects.slice();
    if (updatedSubject) {
      list[idx] = updatedSubject;
    } else {
      list.splice(idx, 1);
    }
    setSubjects(list);
  };

  const getRoleRefDescription = (): string => {
    return state.roleRefKind
      ? `${state.roleRefKind} ${state.roleRefName}`
      : 'new';
  };

  return (
    <div className={classes.root}>
      <SingleTextFieldAccordion
        title="Name"
        expanded={expanded === 'name'}
        onChange={handleChange('name')}
        value={state.name}
        onValueUpdated={value => setState(s => ({ ...s, name: value }))}
      />
      <SingleTextFieldAccordion
        title="Namespace"
        expanded={expanded === 'namespace'}
        onChange={handleChange('namespace')}
        value={state.namespace}
        onValueUpdated={value => setState(s => ({ ...s, namespace: value }))}
      />
      <KeyValueEditorAccordion
        title="Annotations"
        expanded={expanded === 'annotations'}
        onChange={handleChange('annotations')}
        keyValueObject={state.annotations}
        onUpdatedKeyValueObject={data =>
          setState(s => ({ ...s, annotations: data }))
        }
      />
      <KeyValueEditorAccordion
        title="Labels"
        expanded={expanded === 'labels'}
        onChange={handleChange('labels')}
        keyValueObject={state.labels}
        onUpdatedKeyValueObject={data =>
          setState(s => ({ ...s, labels: data }))
        }
      />
      <EditorAccordion
        title="Role Reference"
        description={getRoleRefDescription()}
        expanded={expanded === 'role'}
        onChange={handleChange('role')}
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

      {subjects.map(subject => (
        <SubjectEditorAccordion
          key={subject.key}
          expanded={expanded === `subject-${subject.key}`}
          onChange={handleChange(`subject-${subject.key}`)}
          subject={subject}
          onUpdatedSubject={onSubjectUpdated}
        />
      ))}

      <div className={classes.buttonRow}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            const nextKey = (last(subjects)?.key || 0) + 1;
            setSubjects([...subjects, { key: nextKey, kind: '', name: '' }]);
            setExpanded(`subject-${nextKey}`);
          }}
        >
          Add Subject
        </Button>
      </div>
    </div>
  );
};
