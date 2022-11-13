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
import { Alert } from '@material-ui/lab';
import { groupBy } from 'lodash';
import React, { Fragment } from 'react';
import { PackageSummary } from '../../../utils/packageSummary';
import {
  ContentSummary,
  PackageContentSummaryOrder,
} from '../../../utils/repository';
import { toLowerCase } from '../../../utils/string';
import { PackagesTable } from '../../PackagesTable';

type RelatedTabContentProps = {
  packageDescriptor: string;
  upstreamPackage: PackageSummary | undefined;
  siblingPackages: PackageSummary[];
  downstreamPackages: PackageSummary[];
};

const useStyles = makeStyles({
  packagesTable: {
    marginBottom: '24px',
  },
});

const getDesciptorPriority = (descriptor: string): number =>
  PackageContentSummaryOrder.indexOf(descriptor as ContentSummary);

const compareDescriptors = (descriptor1: string, descriptor2: string): number =>
  getDesciptorPriority(descriptor1) - getDesciptorPriority(descriptor2);

export const RelatedTabContent = ({
  packageDescriptor,
  upstreamPackage,
  siblingPackages,
  downstreamPackages,
}: RelatedTabContentProps) => {
  const classes = useStyles();

  if (!upstreamPackage && downstreamPackages.length === 0) {
    return (
      <Alert severity="info">
        This {toLowerCase(packageDescriptor)} has no upstream or downstream
        packages.
      </Alert>
    );
  }

  const downstreamPackagesByDescriptor = groupBy(
    downstreamPackages,
    packageSummary => packageSummary.packageDescriptor,
  );
  const downstreamPackageDescriptors = Object.keys(
    downstreamPackagesByDescriptor,
  ).sort(compareDescriptors);

  const siblingPackagesByDescriptor = groupBy(
    siblingPackages,
    packageSummary => packageSummary.packageDescriptor,
  );
  const siblingPackageDescriptors = Object.keys(
    siblingPackagesByDescriptor,
  ).sort(compareDescriptors);

  return (
    <Fragment>
      {downstreamPackageDescriptors.map(descriptor => (
        <div key={descriptor} className={classes.packagesTable}>
          <PackagesTable
            title={`Downstream ${descriptor}s`}
            packages={downstreamPackagesByDescriptor[descriptor] ?? []}
            showRepositoryColumn
          />
        </div>
      ))}

      {upstreamPackage && (
        <div className={classes.packagesTable}>
          <PackagesTable
            title={`Upstream ${upstreamPackage.packageDescriptor}`}
            packages={[upstreamPackage]}
            showRepositoryColumn
          />
        </div>
      )}

      {siblingPackageDescriptors.map(descriptor => (
        <div key={descriptor} className={classes.packagesTable}>
          <PackagesTable
            title={`Sibling ${descriptor}s`}
            packages={siblingPackagesByDescriptor[descriptor] ?? []}
            showRepositoryColumn
          />
        </div>
      ))}
    </Fragment>
  );
};
