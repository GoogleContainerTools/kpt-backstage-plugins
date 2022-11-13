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

import { Chip as MaterialChip, makeStyles } from '@material-ui/core';
import React from 'react';

type ChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

const useStyles = makeStyles({
  chip: {
    marginBottom: 0,
    transitionDuration: '0s !important',
    '& > span': {
      fontWeight: 'normal',
    },
  },
});

export const Chip = ({ label, selected, onClick }: ChipProps) => {
  const classes = useStyles();

  return (
    <MaterialChip
      className={classes.chip}
      label={label}
      color={selected ? 'primary' : undefined}
      variant={selected ? undefined : 'outlined'}
      onClick={onClick}
    />
  );
};
