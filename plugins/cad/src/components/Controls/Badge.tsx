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

import { Badge as MaterialBadge, makeStyles } from '@material-ui/core';
import React, { ReactNode } from 'react';

type BadgeProps = {
  badgeContent: number;
  children: ReactNode;
};

const useStyles = makeStyles({
  badge: {
    paddingLeft: '2px',
    paddingRight: '2px',
  },
});

export const Badge = ({ badgeContent, children }: BadgeProps) => {
  const classes = useStyles();

  return (
    <MaterialBadge
      badgeContent={badgeContent}
      className={classes.badge}
      color="primary"
      overlap="rectangular"
    >
      {children}
    </MaterialBadge>
  );
};
