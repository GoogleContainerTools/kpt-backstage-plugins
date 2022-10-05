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

import {
  Checkbox as MaterialCheckbox,
  FormControlLabel,
  FormHelperText,
  makeStyles,
} from '@material-ui/core';
import React, { ChangeEvent } from 'react';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: JSX.Element | string;
};

const useStyles = makeStyles({
  description: {
    marginLeft: '32px',
    marginTop: '0',
  },
});

export const Checkbox = ({
  label,
  checked,
  onChange,
  helperText,
}: CheckboxProps) => {
  const classes = useStyles();

  return (
    <div>
      <FormControlLabel
        control={<MaterialCheckbox checked={checked} color="primary" />}
        label={label}
        onChange={(_: ChangeEvent<{}>, isChecked: boolean) =>
          onChange(isChecked)
        }
      />
      {helperText && (
        <FormHelperText className={classes.description}>
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
};
