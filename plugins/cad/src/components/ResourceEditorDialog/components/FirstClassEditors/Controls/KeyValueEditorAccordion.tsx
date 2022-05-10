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

import { Button, IconButton, TextField } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import React, { Fragment, useRef } from 'react';
import { KubernetesKeyValueObject } from '../../../../../types/KubernetesResource';
import { toLowerCase } from '../../../../../utils/string';
import { useEditorStyles } from '../styles';
import { EditorAccordion, OnAccordionChange } from './EditorAccordion';

type OnUpdatedKeyValueObject = (
  keyValueObject: KubernetesKeyValueObject,
) => void;

type KeyValueObjectEditorProps = {
  title: string;
  expanded: boolean;
  onChange: OnAccordionChange;
  keyValueObject: KubernetesKeyValueObject;
  onUpdatedKeyValueObject: OnUpdatedKeyValueObject;
};

type InternalKeyValue = {
  key: string;
  value: string;
};

export const KeyValueEditorAccordion = ({
  title,
  expanded,
  onChange,
  keyValueObject,
  onUpdatedKeyValueObject,
}: KeyValueObjectEditorProps) => {
  const createKeyValueArray = (): InternalKeyValue[] =>
    Object.entries(keyValueObject || {}).map(([key, value]) => ({
      key,
      value,
    }));

  const state = useRef<InternalKeyValue[]>(createKeyValueArray());

  const classes = useEditorStyles();

  const keyValueObjectUpdated = (): void => {
    const updatedObject = state.current
      .filter(keyValue => keyValue.key !== '')
      .reduce((prev: KubernetesKeyValueObject, keyValue: InternalKeyValue) => {
        prev[keyValue.key] = keyValue.value;
        return prev;
      }, {});

    onUpdatedKeyValueObject(updatedObject);
  };

  const addRow = () => {
    state.current.push({ key: '', value: '' });
    keyValueObjectUpdated();
  };

  const description = `${state.current.length} ${toLowerCase(title)}`;

  return (
    <EditorAccordion
      title={title}
      description={description}
      expanded={expanded}
      onChange={onChange}
    >
      <Fragment>
        {state.current.map((keyValuePair, index) => (
          <div className={classes.multiControlRow} key={index}>
            <TextField
              label="Key"
              variant="outlined"
              value={keyValuePair.key}
              onChange={e => {
                keyValuePair.key = e.target.value;
                keyValueObjectUpdated();
              }}
              fullWidth
            />
            <TextField
              label="Value"
              variant="outlined"
              value={keyValuePair.value}
              onChange={e => {
                keyValuePair.value = e.target.value;
                keyValueObjectUpdated();
              }}
              fullWidth
            />
            <IconButton
              size="small"
              title="Delete"
              className={classes.iconButton}
              onClick={() => {
                state.current = state.current.filter(
                  thisKeyValueObject => thisKeyValueObject !== keyValuePair,
                );
                keyValueObjectUpdated();
              }}
            >
              <DeleteIcon />
            </IconButton>
          </div>
        ))}

        <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
          Add {title}
        </Button>
      </Fragment>
    </EditorAccordion>
  );
};
