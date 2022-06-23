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
  IconButton as MaterialIconButton,
  makeStyles,
  Tooltip,
} from '@material-ui/core';
import React, { ReactNode } from 'react';

type IconButtonProps = {
  title: string;
  className?: string;
  inTable?: boolean;
  stopPropagation?: boolean;
  children: ReactNode;
  onClick?: () => void;
};

const useStyles = makeStyles({
  inTableStyle: {
    position: 'absolute',
    transform: 'translateY(-50%)',
  },
});

export const IconButton = ({
  title,
  className,
  inTable,
  stopPropagation,
  onClick,
  children,
}: IconButtonProps) => {
  const classes = useStyles();

  const finalClassName =
    className || (inTable ? classes.inTableStyle : undefined);

  return (
    <Tooltip title={title}>
      <MaterialIconButton
        size="small"
        className={finalClassName}
        onClick={e => {
          if (!onClick) return;

          if (stopPropagation) {
            e.stopPropagation();
          }

          onClick();
        }}
      >
        {children}
      </MaterialIconButton>
    </Tooltip>
  );
};
