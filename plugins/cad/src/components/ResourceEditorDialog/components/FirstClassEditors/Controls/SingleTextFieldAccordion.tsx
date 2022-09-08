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

import { TextField } from '@material-ui/core';
import React, { Fragment } from 'react';
import { AccordionState, EditorAccordion } from './EditorAccordion';

type OnValueUpdated = (value: string) => void;

type SingleTextFieldAccordionProps = {
  id: string;
  title: string;
  state: AccordionState;
  value: string;
  onValueUpdated: OnValueUpdated;
};

export const SingleTextFieldAccordion = ({
  id,
  title,
  state,
  value,
  onValueUpdated,
}: SingleTextFieldAccordionProps) => {
  return (
    <EditorAccordion id={id} title={title} description={value} state={state}>
      <Fragment>
        <TextField
          label={title}
          variant="outlined"
          value={value}
          onChange={e => onValueUpdated(e.target.value)}
          fullWidth
        />
      </Fragment>
    </EditorAccordion>
  );
};
