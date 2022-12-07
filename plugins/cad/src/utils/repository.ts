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
import { toLowerCase } from './string';

type ContentDetailsLookup = {
  [key: string]: ContentDetails;
};

export type ContentDetails = {
  repositoryContent: RepositoryContent;
  contentSummary: ContentSummary;
  contentLink: string;
  description: string;
  isDeployment?: boolean;
  repositoryContentLabelValue?: string;
  notContent?: ContentSummary[];
  cloneTo: ContentCloneToDetail[];
};

type ContentCloneToDetail = {
  content: ContentSummary;
  preferred: boolean;
  message?: string;
};

const REPOSITORY_CONTENT_LABEL = 'kpt.dev/repository-content';
const REPOSITORY_ACCESS_LABEL = 'kpt.dev/repository-access';

export enum ContentSummary {
  EXTERNAL_BLUEPRINT = 'External Blueprint',
  ORGANIZATIONAL_BLUEPRINT = 'Organizational Blueprint',
  TEAM_BLUEPRINT = 'Team Blueprint',
  DEPLOYMENT = 'Deployment',
  FUNCTION = 'Function',
}

export enum RepositoryAccess {
  FULL = 'full',
  READ_ONLY = 'read-only',
}

export const PackageContentSummaryOrder = [
  ContentSummary.DEPLOYMENT,
  ContentSummary.TEAM_BLUEPRINT,
  ContentSummary.ORGANIZATIONAL_BLUEPRINT,
  ContentSummary.EXTERNAL_BLUEPRINT,
];

export const isRepositoryReady = (repository: Repository): boolean => {
  if (!repository.status?.conditions) {
    return true;
  }

  return !repository.status.conditions.some(r => r.status !== 'True');
};

export const isFunctionRepository = (repository: Repository): boolean => {
  return repository.spec.content === RepositoryContent.FUNCTION;
};

export const isPackageRepository = (repository: Repository): boolean => {
  return repository.spec.content === RepositoryContent.PACKAGE;
};

export const isDeploymentRepository = (repository: Repository): boolean => {
  return isPackageRepository(repository) && !!repository.spec.deployment;
};

export const RepositoryContentDetails: ContentDetailsLookup = {
  [ContentSummary.DEPLOYMENT]: {
    contentSummary: ContentSummary.DEPLOYMENT,
    repositoryContent: RepositoryContent.PACKAGE,
    contentLink: 'deployments',
    description:
      "Deployment Packages are packages ready for deployment to live clusters. If selected, you'll need to specify if the repository is for a development, staging, or production cluster.",
    isDeployment: true,
    cloneTo: [],
  },
  [ContentSummary.TEAM_BLUEPRINT]: {
    contentSummary: ContentSummary.TEAM_BLUEPRINT,
    repositoryContent: RepositoryContent.PACKAGE,
    contentLink: 'team-blueprints',
    description:
      'Team Blueprints are packages that a team in your organization owns. Deployment Packages can be created from packages in this repository.',
    notContent: [
      ContentSummary.ORGANIZATIONAL_BLUEPRINT,
      ContentSummary.EXTERNAL_BLUEPRINT,
    ],
    cloneTo: [
      { content: ContentSummary.DEPLOYMENT, preferred: true },
      { content: ContentSummary.TEAM_BLUEPRINT, preferred: true },
    ],
  },
  [ContentSummary.ORGANIZATIONAL_BLUEPRINT]: {
    contentSummary: ContentSummary.ORGANIZATIONAL_BLUEPRINT,
    repositoryContent: RepositoryContent.PACKAGE,
    repositoryContentLabelValue: 'organizational-blueprints',
    contentLink: 'organizational-blueprints',
    description:
      'Organizational Blueprints are packages that your organization owns. An Organizational Blueprint package is expected to be cloned and customized in a Team Blueprint repository before a Deployment Package is created.',
    cloneTo: [
      {
        content: ContentSummary.DEPLOYMENT,
        preferred: false,
        message:
          'An Organizational Blueprint package is expected to be cloned and customized in a Team Blueprint repository before a Deployment Package is created.',
      },
      { content: ContentSummary.TEAM_BLUEPRINT, preferred: true },
      { content: ContentSummary.ORGANIZATIONAL_BLUEPRINT, preferred: true },
    ],
  },
  [ContentSummary.EXTERNAL_BLUEPRINT]: {
    contentSummary: ContentSummary.EXTERNAL_BLUEPRINT,
    repositoryContent: RepositoryContent.PACKAGE,
    repositoryContentLabelValue: 'external-blueprints',
    contentLink: 'external-blueprints',
    description:
      'External Blueprints are packages that your organization does not own. An External Blueprint package is expected to be cloned and customized in an Organization or Team Blueprint repository before a Deployment Package is created.',
    cloneTo: [
      {
        content: ContentSummary.DEPLOYMENT,
        preferred: false,
        message:
          'An External Blueprint is expected to be cloned and customized in an Organization or Team Blueprint repository before a Deployment Package is created.',
      },
      { content: ContentSummary.TEAM_BLUEPRINT, preferred: true },
      { content: ContentSummary.ORGANIZATIONAL_BLUEPRINT, preferred: true },
      { content: ContentSummary.EXTERNAL_BLUEPRINT, preferred: true },
    ],
  },
  [ContentSummary.FUNCTION]: {
    contentSummary: ContentSummary.FUNCTION,
    repositoryContent: RepositoryContent.FUNCTION,
    contentLink: 'functions',
    description:
      'Functions are containerized programs that can perform CRUD operations on KRM resources.',
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

export const getContentDetailsByLink = (
  contentLink: string,
): ContentDetails => {
  const contentDetails = Object.values(RepositoryContentDetails).find(
    details => details.contentLink === contentLink,
  );

  if (!contentDetails) {
    throw new Error('Unknown package content type');
  }

  return contentDetails;
};

const normalizeRepositoryUrl = (repositoryUrl?: string): string => {
  const normalizeHTTPS = (url: string): string =>
    url.replace('https://', '').replace('.git', '');
  const normalizeSSH = (url: string): string =>
    url.replace('git@', '').replace(':', '/');

  const thisRepositoryUrl = toLowerCase(repositoryUrl ?? '');

  if (thisRepositoryUrl.startsWith('https://')) {
    return normalizeHTTPS(thisRepositoryUrl);
  }

  if (thisRepositoryUrl.startsWith('git@')) {
    return normalizeSSH(thisRepositoryUrl);
  }

  return thisRepositoryUrl;
};

export const isReadOnlyRepository = (repository: Repository): boolean => {
  const isReadOnly =
    repository.metadata.labels?.[REPOSITORY_ACCESS_LABEL] ===
    RepositoryAccess.READ_ONLY;

  return isReadOnly;
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
    throw new Error(`Repository ${repositoryName} does not exist`);
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
    const normalizedUrl = normalizeRepositoryUrl(repositoryUrl);

    return allRepositories.find(
      repository =>
        normalizeRepositoryUrl(repository.spec.git?.repo) === normalizedUrl,
    );
  }

  throw new Error('No repository find criteria specified');
};

export const filterRepositories = (
  allRepositories: Repository[],
  packageDescriptor: string,
): Repository[] => {
  return allRepositories.filter(
    repository => getPackageDescriptor(repository) === packageDescriptor,
  );
};

export const getRepositoryResource = (
  name: string,
  description: string,
  contentSummary: ContentSummary,
  repositoryAccess: RepositoryAccess,
  git?: RepositoryGitDetails,
  oci?: RepositoryOciDetails,
): Repository => {
  const contentDetails = RepositoryContentDetails[contentSummary];

  const content: RepositoryContent = contentDetails.repositoryContent;
  const deployment = contentDetails.isDeployment ? true : undefined;

  const type = git ? RepositoryType.GIT : RepositoryType.OCI;

  const labels: KubernetesKeyValueObject = {};

  if (contentDetails.repositoryContentLabelValue) {
    labels[REPOSITORY_CONTENT_LABEL] =
      contentDetails.repositoryContentLabelValue;
  }

  if (repositoryAccess === RepositoryAccess.READ_ONLY) {
    labels[REPOSITORY_ACCESS_LABEL] = RepositoryAccess.READ_ONLY;
  }

  const resource: Repository = {
    apiVersion: 'config.porch.kpt.dev/v1alpha1',
    kind: 'Repository',
    metadata: {
      name,
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
  createBranch: boolean,
  directory: string,
  secretRef: RepositorySecretRef | undefined,
): RepositoryGitDetails => {
  const gitDetails: RepositoryGitDetails = {
    repo,
    branch,
    createBranch,
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
