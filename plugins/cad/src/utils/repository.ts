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

import { trimEnd } from 'lodash';
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

type EnvironmentDetails = {
  [key: string]: EnvironmentDetail;
};

type EnvironmentDetail = {
  shortName: string;
  description: string;
  repositoryEnvironmentLabelValue?: string;
  notDeploymentEnvironment?: DeploymentEnvironment[];
};

const REPOSITORY_CONTENT_LABEL = 'kpt.dev/repository-content';
const REPOSITORY_DEPLOYMENT_ENVIRONMENT_LABEL =
  'kpt.dev/deployment-environment';

export enum ContentSummary {
  EXTERNAL_BLUEPRINT = 'External Blueprint',
  ORGANIZATIONAL_BLUEPRINT = 'Organizational Blueprint',
  TEAM_BLUEPRINT = 'Team Blueprint',
  DEPLOYMENT = 'Deployment',
  FUNCTION = 'Function',
}

export enum DeploymentEnvironment {
  DEVELOPMENT = 'Development',
  STAGING = 'Staging',
  PRODUCTION = 'Production',
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
    description:
      "Deployment Packages are packages ready for deployment to live clusters. If selected, you'll need to specify if the repository is for a development, staging, or production cluster.",
    isDeployment: true,
    cloneTo: [],
  },
  [ContentSummary.TEAM_BLUEPRINT]: {
    repositoryContent: RepositoryContent.PACKAGE,
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
    repositoryContent: RepositoryContent.PACKAGE,
    repositoryContentLabelValue: 'organizational-blueprints',
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
    repositoryContent: RepositoryContent.PACKAGE,
    repositoryContentLabelValue: 'external-blueprints',
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
    repositoryContent: RepositoryContent.FUNCTION,
    description:
      'Functions are containerized programs that can perform CRUD operations on KRM resources.',
    cloneTo: [],
  },
};

export const DeploymentEnvironmentDetails: EnvironmentDetails = {
  [DeploymentEnvironment.DEVELOPMENT]: {
    shortName: 'dev',
    description:
      'The development environment is the environment your team uses for day-to-day development. A Team Blueprint package is expected to be cloned to this environment first.',
    notDeploymentEnvironment: [
      DeploymentEnvironment.STAGING,
      DeploymentEnvironment.PRODUCTION,
    ],
  },
  [DeploymentEnvironment.STAGING]: {
    shortName: 'staging',
    description:
      'The staging environment is similar to the production environment, except it does not receive live traffic. A Team Blueprint package is expected to be cloned to this environment after it is cloned, published, and tested in the development environment.',
    repositoryEnvironmentLabelValue: 'staging',
  },
  [DeploymentEnvironment.PRODUCTION]: {
    shortName: 'prod',
    description:
      'The production environment receives live traffic. A Team Blueprint package is expected to be cloned to this environment after it is cloned, published, and tested in the staging environment.',
    repositoryEnvironmentLabelValue: 'production',
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

const isDeploymentEnviroment = (
  repository: Repository,
  environment: DeploymentEnvironment,
): boolean => {
  const environmentDetails = DeploymentEnvironmentDetails[environment];

  const isLabelMatch =
    !environmentDetails.repositoryEnvironmentLabelValue ||
    repository.metadata.labels?.[REPOSITORY_DEPLOYMENT_ENVIRONMENT_LABEL] ===
      environmentDetails.repositoryEnvironmentLabelValue;

  const isDeployment = isDeploymentRepository(repository);
  const notContent = environmentDetails.notDeploymentEnvironment ?? [];
  const noDisqualifiers = !notContent
    .map(env => isDeploymentEnviroment(repository, env))
    .includes(true);

  return isDeployment && isLabelMatch && noDisqualifiers;
};

export const getDeploymentEnvironment = (repository: Repository): string => {
  for (const env of Object.keys(DeploymentEnvironmentDetails)) {
    if (isDeploymentEnviroment(repository, env as DeploymentEnvironment)) {
      return env;
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
    const normalize = (repository?: string): string =>
      trimEnd(repository, '.git');

    return allRepositories.find(
      repository =>
        normalize(repository.spec.git?.repo) === normalize(repositoryUrl),
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
  deploymentEnvironment?: DeploymentEnvironment,
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

  if (contentSummary === ContentSummary.DEPLOYMENT && deploymentEnvironment) {
    const environmentDetails =
      DeploymentEnvironmentDetails[deploymentEnvironment];

    if (environmentDetails.repositoryEnvironmentLabelValue) {
      labels[REPOSITORY_DEPLOYMENT_ENVIRONMENT_LABEL] =
        environmentDetails.repositoryEnvironmentLabelValue;
    }
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
