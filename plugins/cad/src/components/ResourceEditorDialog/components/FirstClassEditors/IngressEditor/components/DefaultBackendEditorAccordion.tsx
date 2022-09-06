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
import { clone } from 'lodash';
import React, { Fragment, useMemo, useRef } from 'react';
import { IngressBackend } from '../../../../../../types/Ingress';
import { PackageResource } from '../../../../../../utils/packageRevisionResources';
import { Select } from '../../../../../Controls';
import {
  EditorAccordion,
  OnAccordionChange,
} from '../../Controls/EditorAccordion';
import { IngressBackendPanel } from './IngressBackendPanel';

type OnUpdate = (newValue?: IngressBackend) => void;

type DefaultBackendEditorAccordionProps = {
  expanded: boolean;
  onChange: OnAccordionChange;
  value?: IngressBackend;
  onUpdate: OnUpdate;
  serviceResources: PackageResource[];
};

const useDefaultBackendSelectItems: SelectItem[] = [
  {
    label: 'use default backend',
    value: 'true',
  },
  {
    label: 'no default backend',
    value: 'false',
  },
];

export const DefaultBackendEditorAccordion = ({
  expanded,
  onChange,
  value: defaultBackend,
  onUpdate,
  serviceResources,
}: DefaultBackendEditorAccordionProps) => {
  const refViewModel = useRef<IngressBackend>(clone(defaultBackend || {}));
  const viewModel = refViewModel.current;

  const isDefaultBackend = !!defaultBackend;
  let useDefaultBackendSelection = isDefaultBackend ? 'true' : 'false';

  const valueUpdated = (): void => {
    onUpdate(
      useDefaultBackendSelection === 'true' ? refViewModel.current : undefined,
    );
  };

  const description = useMemo(() => {
    if (!isDefaultBackend) return 'no default backend';

    if (!viewModel.service) return 'default backend not yet configured';

    return `${viewModel.service.name}:${
      viewModel.service.port.name || viewModel.service.port.number
    }`;
  }, [isDefaultBackend, viewModel]);

  return (
    <EditorAccordion
      title="Default Backend"
      description={description}
      expanded={expanded}
      onChange={onChange}
    >
      <Fragment>
        <Select
          label="Default Backend"
          items={useDefaultBackendSelectItems}
          selected={useDefaultBackendSelection}
          onChange={value => {
            useDefaultBackendSelection = value;
            valueUpdated();
          }}
        />

        {isDefaultBackend && (
          <IngressBackendPanel
            value={refViewModel.current}
            serviceResources={serviceResources}
            onUpdate={backend => {
              refViewModel.current = backend;
              valueUpdated();
            }}
          />
        )}
      </Fragment>
    </EditorAccordion>
  );
};
