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
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select as MaterialSelect,
} from '@material-ui/core';
import React, { ChangeEvent } from 'react';

type MultiSelectProps = {
  label: string;
  value: string[];
  items: SelectItem[];
  onChange: (items: string[]) => void;
  className?: string;
  helperText?: string;
};

export const MultiSelect = ({
  label,
  value,
  items,
  onChange,
  className,
  helperText,
}: MultiSelectProps) => {
  const handleChange = (
    event: ChangeEvent<{ name?: string | undefined; value: unknown }>,
  ): void => {
    onChange(event.target.value as string[]);
  };

  return (
    <FormControl fullWidth variant="outlined" className={className}>
      <InputLabel id="select-label">{label}</InputLabel>
      <MaterialSelect
        labelId="select-label"
        multiple
        value={value}
        label={label}
        onChange={handleChange}
      >
        {items.map(item => (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </MaterialSelect>
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
