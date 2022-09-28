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

import { groupBy, uniq } from 'lodash';
import React, { Fragment } from 'react';
import { PackageRevision } from '../../../types/PackageRevision';
import { Repository } from '../../../types/Repository';
import { PackageSummary } from '../../../utils/packageSummary';
import { getPackageDescriptor } from '../../../utils/repository';
import { PackageLink } from '../../Links';

type RelatedPackagesContentProps = {
  upstreamRepository?: Repository;
  upstreamPackageRevision?: PackageRevision;
  downstreamPackages: PackageSummary[];
  showDownstream: boolean;
};

type UpstreamPackageContentProps = {
  upstreamRepository: Repository;
  upstreamPackageRevision: PackageRevision;
};

type DownstreamPackageContentProps = {
  downstreamPackages: PackageSummary[];
};

const UpstreamPackageContent = ({
  upstreamRepository,
  upstreamPackageRevision,
}: UpstreamPackageContentProps) => {
  const packageDescriptor = getPackageDescriptor(upstreamRepository);

  return (
    <Fragment>
      <div>
        {packageDescriptor}:&nbsp;
        <PackageLink packageRevision={upstreamPackageRevision} />
      </div>
    </Fragment>
  );
};

const DownstreamPackageContent = ({
  downstreamPackages,
}: DownstreamPackageContentProps) => {
  const packagesByDescriptor = groupBy(
    downstreamPackages,
    packageSummary => packageSummary.packageDescriptor,
  );
  const packageDescriptors = uniq(Object.keys(packagesByDescriptor));
  if (packageDescriptors.length === 0) {
    packageDescriptors.push('Package');
  }

  return (
    <Fragment>
      {packageDescriptors.map(descriptor => (
        <div key={descriptor}>
          Downstream {descriptor}s:&nbsp;
          {(packagesByDescriptor[descriptor] ?? []).length}
        </div>
      ))}
    </Fragment>
  );
};

export const RelatedPackagesContent = ({
  upstreamRepository,
  upstreamPackageRevision,
  downstreamPackages,
  showDownstream,
}: RelatedPackagesContentProps) => {
  return (
    <Fragment>
      {upstreamRepository && upstreamPackageRevision && (
        <UpstreamPackageContent
          upstreamRepository={upstreamRepository}
          upstreamPackageRevision={upstreamPackageRevision}
        />
      )}
      {showDownstream && (
        <DownstreamPackageContent downstreamPackages={downstreamPackages} />
      )}
    </Fragment>
  );
};
