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

import { makeStyles } from '@material-ui/core';
import { groupBy, uniq } from 'lodash';
import React, { Fragment } from 'react';
import { PackageSummary } from '../../../utils/packageSummary';
import {
  ContentSummary,
  PackageContentSummaryOrder,
} from '../../../utils/repository';
import { PackagesTable } from '../../PackagesTable';

type ResourcesTabContentProps = {
  packageDescriptor: string;
  downstreamPackages: PackageSummary[];
};

const useStyles = makeStyles({
  packagesTable: {
    marginBottom: '24px',
  },
});

export const DownstreamTabContent = ({
  packageDescriptor,
  downstreamPackages,
}: ResourcesTabContentProps) => {
  const classes = useStyles();

  const getDesciptorPriority = (descriptor: string): number =>
    PackageContentSummaryOrder.indexOf(descriptor as ContentSummary);
  const compareDescriptors = (
    descriptor1: string,
    descriptor2: string,
  ): number =>
    getDesciptorPriority(descriptor1) > getDesciptorPriority(descriptor2)
      ? 1
      : -1;

  const requiredDescriptorToShow =
    PackageContentSummaryOrder[getDesciptorPriority(packageDescriptor) - 1];
  const packagesByDescriptor = groupBy(
    downstreamPackages,
    packageSummary => packageSummary.packageDescriptor,
  );

  const packageDescriptorsToDisplay = uniq([
    requiredDescriptorToShow,
    ...Object.keys(packagesByDescriptor),
  ]).sort(compareDescriptors);

  return (
    <Fragment>
      {packageDescriptorsToDisplay.map(descriptor => (
        <div key={descriptor} className={classes.packagesTable}>
          <PackagesTable
            title={`${descriptor}s`}
            packages={packagesByDescriptor[descriptor] ?? []}
            showRepositoryColumn
          />
        </div>
      ))}
    </Fragment>
  );
};
