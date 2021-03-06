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

import { SvgIcon } from '@material-ui/core';
import DraftsIcon from '@material-ui/icons/Drafts';
import React, { Fragment } from 'react';
import { PackageRevisionLifecycle } from '../../types/PackageRevision';

const DraftPackageIcon = () => <DraftsIcon />;

const ProposedPackageIcon = () => (
  <SvgIcon>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.88 9.54L8.92 16.5l-1.41-1.41 4.96-4.96L10.34 8l5.65.01.01 5.65-2.12-2.12z" />
  </SvgIcon>
);

type PackageIconProps = {
  lifecycle: PackageRevisionLifecycle;
};

export const PackageIcon = ({ lifecycle }: PackageIconProps) => {
  switch (lifecycle) {
    case PackageRevisionLifecycle.DRAFT:
      return <DraftPackageIcon />;

    case PackageRevisionLifecycle.PROPOSED:
      return <ProposedPackageIcon />;

    default:
  }

  return <Fragment />;
};
