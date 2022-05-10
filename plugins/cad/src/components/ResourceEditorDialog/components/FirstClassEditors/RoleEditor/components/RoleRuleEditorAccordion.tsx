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
import React, { Fragment, useRef } from 'react';
import { MultiSelect } from '../../../../../Controls/MultiSelect';
import {
  EditorAccordion,
  OnAccordionChange,
} from '../../Controls/EditorAccordion';
import { RoleRuleView } from '../RoleEditor';

type OnUpdatedRule = (originalRule: RoleRuleView, rule?: RoleRuleView) => void;

type RoleRuleEditorAccordionProps = {
  title: string;
  expanded: boolean;
  onChange: OnAccordionChange;
  rule: RoleRuleView;
  onUpdatedRule: OnUpdatedRule;
};

type ViewModel = {
  apiGroups: string;
  resources: string;
  verbs: string[];
};

const VERBS = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'];
const verbsSelectItems: SelectItem[] = VERBS.map(verb => ({
  label: verb,
  value: verb,
}));

export const RoleRuleEditorAccordion = ({
  title,
  expanded,
  onChange,
  rule,
  onUpdatedRule,
}: RoleRuleEditorAccordionProps) => {
  const viewModel = useRef<ViewModel>({
    apiGroups: rule?.apiGroups?.join(', ') || '',
    resources: rule?.resources?.join(', ') || '',
    verbs: rule?.verbs ?? [],
  });

  const ruleUpdated = (): void => {
    const toStringArray = (str: string): string[] | undefined =>
      str.trim().length > 0 ? str.split(',').map(s => s.trim()) : undefined;

    const updatedRule: RoleRuleView = {
      ...rule,
      apiGroups: toStringArray(viewModel.current.apiGroups),
      resources: toStringArray(viewModel.current.resources),
      verbs:
        viewModel.current.verbs.length > 0
          ? viewModel.current.verbs
          : undefined,
    };

    onUpdatedRule(rule, updatedRule);
  };

  return (
    <EditorAccordion title={title} expanded={expanded} onChange={onChange}>
      <Fragment>
        <TextField
          label="API Groups"
          variant="outlined"
          value={viewModel.current.apiGroups}
          helperText="Comma separated list of allowed api groups"
          onChange={e => {
            viewModel.current.apiGroups = e.target.value;
            ruleUpdated();
          }}
          fullWidth
        />

        <TextField
          label="Resources"
          variant="outlined"
          value={viewModel.current.resources}
          helperText="Comma separated list of allowed resources"
          onChange={e => {
            viewModel.current.resources = e.target.value;
            ruleUpdated();
          }}
          fullWidth
        />

        <MultiSelect
          label="Verbs"
          value={viewModel.current.verbs}
          items={verbsSelectItems}
          helperText="List of allowed verbs"
          onChange={updatedList => {
            viewModel.current.verbs = updatedList;
            ruleUpdated();
          }}
        />

        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => onUpdatedRule(rule, undefined)}
        >
          Delete
        </Button>
      </Fragment>
    </EditorAccordion>
  );
};
