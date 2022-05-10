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
import { Autocomplete as MaterialAutocomplete } from '@material-ui/lab';
import React, { ChangeEvent, useEffect, useRef } from 'react';

type AutocompleteProps = {
  label: string;
  options: string[];
  value: string;
  onInputChange: (newValue: string) => void;
};

export const Autocomplete = ({
  label,
  options,
  value,
  onInputChange,
}: AutocompleteProps) => {
  const thisValue = useRef<string>(value);
  const inputValue = useRef<string>(value);

  useEffect(() => {
    if (inputValue.current !== value) {
      thisValue.current = value;
      inputValue.current = value;
    }
  }, [value]);

  const onAutocompleteChange = (
    _: ChangeEvent<{}>,
    newValue: string | null,
  ): void => {
    thisValue.current = newValue as string;
  };

  const onAutocompleteInputChange = (
    _: ChangeEvent<{}>,
    newValue: string,
  ): void => {
    inputValue.current = newValue;
    onInputChange(inputValue.current);
  };

  return (
    <MaterialAutocomplete
      fullWidth
      options={options}
      renderInput={params => (
        <TextField {...params} label={label} variant="outlined" fullWidth />
      )}
      onChange={onAutocompleteChange}
      onInputChange={onAutocompleteInputChange}
      value={thisValue.current}
      inputValue={inputValue.current}
    />
  );
};
