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
import React, { Fragment, useMemo, useRef } from 'react';
import { Select } from '../../../../../Controls';
import {
  AccordionState,
  EditorAccordion,
} from '../../Controls/EditorAccordion';

type OnUpdate = (newValue?: string) => void;

type CustomControllerEditorAccordionProps = {
  id: string;
  state: AccordionState;
  value?: string;
  onUpdate: OnUpdate;
};

const useCustomControllerSelectItems: SelectItem[] = [
  {
    label: 'use default ingress controller',
    value: 'false',
  },
  {
    label: 'use custom ingress controller',
    value: 'true',
  },
];

export const CustomControllerEditorAccordion = ({
  id,
  state,
  value: ingressClassName,
  onUpdate,
}: CustomControllerEditorAccordionProps) => {
  const refViewModel = useRef<string>(ingressClassName ?? '');
  const viewModel = refViewModel.current;

  const isCustomController = ingressClassName !== undefined;
  let selection = isCustomController ? 'true' : 'false';

  const valueUpdated = (): void => {
    onUpdate(selection === 'true' ? refViewModel.current : undefined);
  };

  const description = useMemo(() => {
    if (!isCustomController) return 'use default ingress controller';

    if (!viewModel) return 'custom controller not yet defined';

    return viewModel;
  }, [isCustomController, viewModel]);

  return (
    <EditorAccordion
      id={id}
      title="Custom Controller"
      description={description}
      state={state}
    >
      <Fragment>
        <Select
          label="Custom Controller"
          items={useCustomControllerSelectItems}
          selected={selection}
          onChange={value => {
            selection = value;
            valueUpdated();
          }}
        />

        {isCustomController && (
          <TextField
            label="Ingress Class Name"
            variant="outlined"
            value={viewModel}
            onChange={e => {
              refViewModel.current = e.target.value;
              valueUpdated();
            }}
            fullWidth
          />
        )}
      </Fragment>
    </EditorAccordion>
  );
};
