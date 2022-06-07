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

import { groupBy } from 'lodash';
import { Kptfile } from '../types/Kptfile';
import { PackageRevision } from '../types/PackageRevision';
import { PackageRevisionResources } from '../types/PackageRevisionResource';
import { Repository } from '../types/Repository';
import { RootSync } from '../types/RootSync';
import { findRootSyncForPackage } from './configSync';
import {
  findLatestPublishedRevision,
  isLatestPublishedRevision,
  isNotAPublishedRevision,
  sortByPackageNameAndRevisionComparison,
} from './packageRevision';
import {
  getPackageResourcesFromResourcesMap,
  getPackageRevisionResources,
} from './packageRevisionResources';
import { loadYaml } from './yaml';

export type PackageSummary = {
  repository: Repository;
  latestRevision: PackageRevision;
  latestPublishedRevision?: PackageRevision;
  unpublishedRevision?: PackageRevision;
  upstreamRevision?: PackageRevision;
  upstreamPackageName?: string;
  upstreamPackageRevision?: string;
  sync?: RootSync;
};

export const getPackageSummaries = (
  packageRevisions: PackageRevision[],
  packageRevisionResources: PackageRevisionResources[],
  upstreamRevisions: PackageRevision[],
  repository: Repository,
): PackageSummary[] => {
  const latestPackageRevisions = packageRevisions.filter(
    packageRevision =>
      isNotAPublishedRevision(packageRevision) ||
      isLatestPublishedRevision(packageRevision),
  );

  latestPackageRevisions.sort(sortByPackageNameAndRevisionComparison);

  const groupByPackage = groupBy(
    latestPackageRevisions,
    revision => revision.spec.packageName,
  );

  const packageSummaries: PackageSummary[] = Object.keys(groupByPackage).map(
    packageName => {
      const allRevisions = groupByPackage[packageName];

      const latestRevision = allRevisions[0];
      const latestPublishedRevision = findLatestPublishedRevision(allRevisions);

      const isLatestRevisionNotPublished =
        isNotAPublishedRevision(latestRevision);

      const unpublishedRevision = isLatestRevisionNotPublished
        ? latestRevision
        : undefined;

      const thisPackageSummary: PackageSummary = {
        repository,
        latestRevision,
        latestPublishedRevision,
        unpublishedRevision,
      };

      const useVersion = latestPublishedRevision ?? latestRevision;
      const upstreamPackageRevisionName = useVersion.metadata.name;

      const resources = getPackageRevisionResources(
        packageRevisionResources,
        upstreamPackageRevisionName,
      );

      const packageResources = getPackageResourcesFromResourcesMap(
        resources.spec.resources,
      );
      const kptfileResource = packageResources.find(r => r.kind === 'Kptfile');

      if (kptfileResource) {
        const kptfile = loadYaml(kptfileResource.yaml) as Kptfile;

        if (kptfile.upstream?.git?.ref) {
          const [upstreamPackageName, upstreamPackageRevision] =
            kptfile.upstream.git.ref.split('/');

          thisPackageSummary.upstreamPackageName = upstreamPackageName;
          thisPackageSummary.upstreamPackageRevision = upstreamPackageRevision;

          thisPackageSummary.upstreamRevision = upstreamRevisions.find(
            r =>
              r.spec.packageName === upstreamPackageName &&
              r.spec.revision === upstreamPackageRevision,
          );
        }
      }

      return thisPackageSummary;
    },
  );

  return packageSummaries;
};

export const updatePackageSummariesSyncStatus = (
  packageSummaries: PackageSummary[],
  syncs: RootSync[],
): PackageSummary[] => {
  return packageSummaries.map(packageSummary => {
    const repository = packageSummary.repository;
    const latestPublishedRevision = packageSummary.latestPublishedRevision;

    const sync = latestPublishedRevision
      ? findRootSyncForPackage(syncs ?? [], latestPublishedRevision, repository)
      : undefined;

    packageSummary.sync = sync;

    return packageSummary;
  });
};
