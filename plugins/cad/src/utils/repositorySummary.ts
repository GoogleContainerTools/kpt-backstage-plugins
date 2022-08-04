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

import { PackageRevision } from '../types/PackageRevision';
import {
  Repository,
  RepositoryGitDetails,
  RepositoryOciDetails,
  RepositoryUpstream,
} from '../types/Repository';
import { RepositorySummary } from '../types/RepositorySummary';
import { filterPackageSummaries, getPackageSummaries } from './packageSummary';
import { isBlueprintRepository } from './repository';

type RepositoryDetails = RepositoryUpstream;

export const getRepositorySummaries = (
  allRepositories: Repository[],
): RepositorySummary[] => {
  const repositorySummaries: RepositorySummary[] = allRepositories.map(
    repository => ({ repository: repository, downstreamRepositories: [] }),
  );

  const gitRepoString = (git?: RepositoryGitDetails): string =>
    git ? `${git.repo}:${git.branch}:${git.directory}` : '';
  const ociRepoString = (oci?: RepositoryOciDetails): string =>
    oci ? oci.registry : '';
  const getRepoString = (repoDetails: RepositoryDetails) =>
    `${repoDetails.type}:${gitRepoString(repoDetails.git)}:${ociRepoString(
      repoDetails.oci,
    )}`;

  for (const repositorySummary of repositorySummaries) {
    const repository = repositorySummary.repository;

    if (repository.spec.upstream) {
      repositorySummary.upstreamRepository = allRepositories.find(
        r =>
          repository.spec.upstream &&
          getRepoString(r.spec) === getRepoString(repository.spec.upstream),
      );
    }

    if (isBlueprintRepository(repository)) {
      repositorySummary.downstreamRepositories = allRepositories.filter(
        r =>
          r.spec.upstream &&
          getRepoString(r.spec.upstream) === getRepoString(repository.spec),
      );
    }
  }

  return repositorySummaries;
};

export const getRepositorySummary = (
  repositorySummaries: RepositorySummary[],
  name: string,
): RepositorySummary => {
  const repositorySummary = repositorySummaries.find(
    summary => summary.repository.metadata.name === name,
  );

  if (!repositorySummary) {
    throw new Error(`Repository ${name} does not exist`);
  }

  return repositorySummary;
};

export const populatePackageSummaries = (
  repositorySummaries: RepositorySummary[],
  packageRevisions: PackageRevision[],
) => {
  const allPackageSummaries = getPackageSummaries(
    packageRevisions,
    repositorySummaries,
    repositorySummaries.map(summary => summary.repository),
  );

  repositorySummaries.forEach(repositorySummary => {
    repositorySummary.packageSummaries = filterPackageSummaries(
      allPackageSummaries,
      { repository: repositorySummary.repository },
    );
  });
};

export const fitlerRepositorySummary = (
  repositorySummaries: RepositorySummary[],
  repositoryFilter: (repository: Repository) => boolean,
): RepositorySummary[] => {
  return repositorySummaries.filter(summary =>
    repositoryFilter(summary.repository),
  );
};
