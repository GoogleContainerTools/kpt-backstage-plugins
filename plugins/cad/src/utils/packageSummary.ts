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
import { PackageRevision } from '../types/PackageRevision';
import { Repository } from '../types/Repository';
import { RepositorySummary } from '../types/RepositorySummary';
import { RootSync } from '../types/RootSync';
import { findRootSyncForPackage } from './configSync';
import {
  filterPackageRevisions,
  findLatestPublishedRevision,
  findPackageRevision,
  getUpstreamPackageRevisionDetails,
  isLatestPublishedRevision,
  isNotAPublishedRevision,
  sortByPackageNameAndRevisionComparison,
} from './packageRevision';
import { findRepository } from './repository';

export type PackageSummary = {
  repository: Repository;
  latestRevision: PackageRevision;
  latestPublishedRevision?: PackageRevision;
  unpublishedRevision?: PackageRevision;
  upstreamRevision?: PackageRevision;
  upstreamPackageName?: string;
  upstreamPackageRevision?: string;
  upstreamLatestPublishedRevision?: PackageRevision;
  isUpgradeAvailable?: boolean;
  sync?: RootSync;
};

export const getPackageSummariesForRepository = (
  packageRevisions: PackageRevision[],
  allPackageRevisions: PackageRevision[],
  repository: Repository,
  allRepositories: Repository[],
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

      const useRevision = latestPublishedRevision ?? latestRevision;
      const upstream = getUpstreamPackageRevisionDetails(useRevision);

      if (upstream) {
        thisPackageSummary.upstreamPackageName = upstream.packageName;
        thisPackageSummary.upstreamPackageRevision = upstream.revision;

        const upstreamRepository = findRepository(allRepositories, {
          repositoryUrl: upstream.repositoryUrl,
        });

        if (upstreamRepository) {
          const upstreamRepositoryName = upstreamRepository.metadata.name;

          thisPackageSummary.upstreamRevision = findPackageRevision(
            allPackageRevisions,
            upstream.packageName,
            upstream.revision,
            upstreamRepositoryName,
          );

          thisPackageSummary.upstreamLatestPublishedRevision =
            findLatestPublishedRevision(
              filterPackageRevisions(
                allPackageRevisions,
                upstream.packageName,
                upstreamRepositoryName,
              ),
            );

          thisPackageSummary.isUpgradeAvailable =
            thisPackageSummary.upstreamLatestPublishedRevision?.spec
              .revision !== upstream.revision;
        }
      }

      return thisPackageSummary;
    },
  );

  return packageSummaries;
};

export const getPackageSummaries = (
  packageRevisions: PackageRevision[],
  repositorySummaries: RepositorySummary[],
  allRepositories: Repository[],
): PackageSummary[] => {
  const packageSummaries = [];

  for (const repositorySummary of repositorySummaries) {
    const repositoryPackageRevisions = packageRevisions.filter(
      revision =>
        revision.spec.repository === repositorySummary.repository.metadata.name,
    );

    const repositoryPackageSummaries = getPackageSummariesForRepository(
      repositoryPackageRevisions,
      packageRevisions,
      repositorySummary.repository,
      allRepositories,
    );

    packageSummaries.push(...repositoryPackageSummaries);
  }

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

export const filterPackageSummaries = (
  packageSummaries: PackageSummary[],
  { repository }: { repository: Repository },
): PackageSummary[] => {
  return packageSummaries.filter(
    packageSummary => packageSummary.repository === repository,
  );
};
