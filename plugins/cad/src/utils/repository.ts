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

import { KubernetesKeyValueObject } from '../types/KubernetesResource';
import {
  Repository,
  RepositoryContent,
  RepositoryGitDetails,
  RepositoryOciDetails,
  RepositorySecretRef,
  RepositoryType,
  RepositoryUpstream,
} from '../types/Repository';

const CATELOG_BLUEPRINT_REPOSITORY_LABEL =
  'kpt.dev/catalog-blueprint-repository';

export enum ContentSummary {
  CATALOG_BLUEPRINT = 'Catalog Blueprint',
  BLUEPRINT = 'Blueprint',
  DEPLOYMENT = 'Deployment',
  FUNCTION = 'Function',
}

export const isFunctionRepository = (repository: Repository): boolean => {
  return repository.spec.content === RepositoryContent.FUNCTION;
};

export const isPackageRepository = (repository: Repository): boolean => {
  return repository.spec.content === RepositoryContent.PACKAGE;
};

export const isBlueprintRepository = (repository: Repository): boolean => {
  return isPackageRepository(repository) && !repository.spec.deployment;
};

export const isCatalogBlueprintRepository = (
  repository: Repository,
): boolean => {
  return (
    isBlueprintRepository(repository) &&
    !!repository.metadata.labels?.[CATELOG_BLUEPRINT_REPOSITORY_LABEL]
  );
};

export const isDeployableBlueprintRepository = (
  repository: Repository,
): boolean => {
  return (
    isBlueprintRepository(repository) &&
    !repository.metadata.labels?.[CATELOG_BLUEPRINT_REPOSITORY_LABEL]
  );
};

export const isDeploymentRepository = (repository: Repository): boolean => {
  return isPackageRepository(repository) && !!repository.spec.deployment;
};

export const getPackageDescriptor = (repository: Repository): string => {
  if (isCatalogBlueprintRepository(repository))
    return ContentSummary.CATALOG_BLUEPRINT;
  if (isDeployableBlueprintRepository(repository))
    return ContentSummary.BLUEPRINT;
  if (isDeploymentRepository(repository)) return ContentSummary.DEPLOYMENT;
  if (isFunctionRepository(repository)) return ContentSummary.FUNCTION;

  return 'Unknown';
};

export const getUpstreamPackageDescriptor = (
  repository: Repository,
): string => {
  if (isDeployableBlueprintRepository(repository))
    return ContentSummary.CATALOG_BLUEPRINT;
  if (isDeploymentRepository(repository)) return ContentSummary.BLUEPRINT;

  return 'Upstream Package';
};

export const getRepositoryTitle = (repository: Repository): string => {
  return repository.metadata.name;
};

export const getRepositoryResource = (
  name: string,
  description: string,
  contentSummary: ContentSummary,
  git?: RepositoryGitDetails,
  oci?: RepositoryOciDetails,
  upstream?: RepositoryUpstream,
): Repository => {
  const namespace = 'default';

  const content: RepositoryContent =
    contentSummary === ContentSummary.FUNCTION
      ? RepositoryContent.FUNCTION
      : RepositoryContent.PACKAGE;
  const deployment =
    contentSummary === ContentSummary.DEPLOYMENT ? true : undefined;

  const type = git ? RepositoryType.GIT : RepositoryType.OCI;

  const labels: KubernetesKeyValueObject = {};

  if (contentSummary === ContentSummary.CATALOG_BLUEPRINT) {
    labels[CATELOG_BLUEPRINT_REPOSITORY_LABEL] = 'true';
  }

  const resource: Repository = {
    apiVersion: 'config.porch.kpt.dev/v1alpha1',
    kind: 'Repository',
    metadata: {
      name,
      namespace,
      labels,
    },
    spec: {
      description,
      content,
      type,
      git,
      oci,
      deployment,
      upstream,
    },
  };

  return resource;
};

export const getRepositoryGitDetails = (
  repo: string,
  branch: string,
  directory: string,
  secretRef: RepositorySecretRef | undefined,
): RepositoryGitDetails => {
  const gitDetails: RepositoryGitDetails = {
    repo,
    branch,
    directory,
    secretRef,
  };

  return gitDetails;
};

export const getRepositoryOciDetails = (
  registry: string,
  secretRef: RepositorySecretRef | undefined,
): RepositoryOciDetails => {
  const ociDetails: RepositoryOciDetails = {
    registry,
    secretRef,
  };

  return ociDetails;
};

export const getSecretRef = (secretName: string): RepositorySecretRef => {
  const secretRef: RepositorySecretRef = {
    name: secretName,
  };

  return secretRef;
};
