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
} from '../types/Repository';

type ContentDetails = {
  [key: string]: ContentDetail;
};

type ContentDetail = {
  repositoryContent: RepositoryContent;
  isDeployment?: boolean;
  repositoryContentLabelValue?: string;
  notContent?: ContentSummary[];
  cloneTo: ContentSummary[];
};

const REPOSITORY_CONTENT_LABEL = 'kpt.dev/repository-content';

export enum ContentSummary {
  EXTERNAL_BLUEPRINT = 'External Blueprint',
  ORGANIZATIONAL_BLUEPRINT = 'Organizational Blueprint',
  TEAM_BLUEPRINT = 'Team Blueprint',
  DEPLOYMENT = 'Deployment',
  FUNCTION = 'Function',
}

export const PackageContentSummaryOrder = [
  ContentSummary.DEPLOYMENT,
  ContentSummary.TEAM_BLUEPRINT,
  ContentSummary.ORGANIZATIONAL_BLUEPRINT,
  ContentSummary.EXTERNAL_BLUEPRINT,
];

export const isFunctionRepository = (repository: Repository): boolean => {
  return repository.spec.content === RepositoryContent.FUNCTION;
};

export const isPackageRepository = (repository: Repository): boolean => {
  return repository.spec.content === RepositoryContent.PACKAGE;
};

export const isDeploymentRepository = (repository: Repository): boolean => {
  return isPackageRepository(repository) && !!repository.spec.deployment;
};

export const RepositoryContentDetails: ContentDetails = {
  [ContentSummary.DEPLOYMENT]: {
    repositoryContent: RepositoryContent.PACKAGE,
    isDeployment: true,
    cloneTo: [],
  },
  [ContentSummary.TEAM_BLUEPRINT]: {
    repositoryContent: RepositoryContent.PACKAGE,
    notContent: [
      ContentSummary.ORGANIZATIONAL_BLUEPRINT,
      ContentSummary.EXTERNAL_BLUEPRINT,
    ],
    cloneTo: [ContentSummary.DEPLOYMENT, ContentSummary.TEAM_BLUEPRINT],
  },
  [ContentSummary.ORGANIZATIONAL_BLUEPRINT]: {
    repositoryContent: RepositoryContent.PACKAGE,
    repositoryContentLabelValue: 'organizational-blueprints',
    cloneTo: [
      ContentSummary.DEPLOYMENT,
      ContentSummary.TEAM_BLUEPRINT,
      ContentSummary.ORGANIZATIONAL_BLUEPRINT,
    ],
  },
  [ContentSummary.EXTERNAL_BLUEPRINT]: {
    repositoryContent: RepositoryContent.PACKAGE,
    repositoryContentLabelValue: 'external-blueprints',
    cloneTo: [
      ContentSummary.DEPLOYMENT,
      ContentSummary.TEAM_BLUEPRINT,
      ContentSummary.ORGANIZATIONAL_BLUEPRINT,
      ContentSummary.EXTERNAL_BLUEPRINT,
    ],
  },
  [ContentSummary.FUNCTION]: {
    repositoryContent: RepositoryContent.FUNCTION,
    cloneTo: [],
  },
};

const isRepositoryContent = (
  repository: Repository,
  contentType: ContentSummary,
): boolean => {
  const repositoryDetails = RepositoryContentDetails[contentType];

  const isContentTypeMatch =
    repository.spec.content === repositoryDetails.repositoryContent;
  const isDeploymentMatch =
    !!repository.spec.deployment === !!repositoryDetails.isDeployment;
  const isLabelMatch =
    !repositoryDetails.repositoryContentLabelValue ||
    repository.metadata.labels?.[REPOSITORY_CONTENT_LABEL] ===
      repositoryDetails.repositoryContentLabelValue;

  const notContent = repositoryDetails.notContent ?? [];
  const noDisqualifiers = !notContent
    .map(content => isRepositoryContent(repository, content))
    .includes(true);

  return (
    isContentTypeMatch && isDeploymentMatch && isLabelMatch && noDisqualifiers
  );
};

export const getPackageDescriptor = (repository: Repository): string => {
  for (const contentType of Object.keys(RepositoryContentDetails)) {
    if (isRepositoryContent(repository, contentType as ContentSummary)) {
      return contentType;
    }
  }

  return 'Unknown';
};

export const getRepository = (
  allRepositories: Repository[],
  repositoryName: string,
): Repository => {
  const repository = allRepositories.find(
    thisRepository => thisRepository.metadata.name === repositoryName,
  );

  if (!repository) {
    throw new Error(`Repository ${name} does not exist`);
  }

  return repository;
};

export const getRepositoryTitle = (repository: Repository): string => {
  return repository.metadata.name;
};

export const findRepository = (
  allRepositories: Repository[],
  { repositoryUrl }: { repositoryUrl?: string },
): Repository | undefined => {
  if (repositoryUrl) {
    return allRepositories.find(
      repository => repository.spec.git?.repo === repositoryUrl,
    );
  }

  throw new Error('No repository find criteria specified');
};

export const getRepositoryResource = (
  name: string,
  description: string,
  contentSummary: ContentSummary,
  git?: RepositoryGitDetails,
  oci?: RepositoryOciDetails,
): Repository => {
  const namespace = 'default';

  const contentDetails = RepositoryContentDetails[contentSummary];

  const content: RepositoryContent = contentDetails.repositoryContent;
  const deployment = contentDetails.isDeployment ? true : undefined;

  const type = git ? RepositoryType.GIT : RepositoryType.OCI;

  const labels: KubernetesKeyValueObject = {};

  if (contentDetails.repositoryContentLabelValue) {
    labels[REPOSITORY_CONTENT_LABEL] =
      contentDetails.repositoryContentLabelValue;
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
