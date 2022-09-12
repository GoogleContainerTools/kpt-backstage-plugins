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

import { InfoCard, StructuredMetadataTable } from '@backstage/core-components';
import React from 'react';
import { Repository } from '../../../types/Repository';
import { RepositorySummary } from '../../../types/RepositorySummary';
import { getPackageDescriptor } from '../../../utils/repository';

type RepositoryDetailsProps = {
  repositorySummary: RepositorySummary;
};

type Metadata = {
  [key: string]: string;
};

const getRepositoryStoreMetadata = (repository: Repository): Metadata => {
  const gitDetails = repository.spec.git;
  const ociDetails = repository.spec.oci;

  if (gitDetails) {
    const gitMetadata: Metadata = {
      repositoryURL: gitDetails.repo,
      secret: gitDetails.secretRef?.name ?? 'none',
      branch: gitDetails.branch,
      directory: gitDetails.directory,
    };

    return gitMetadata;
  }

  if (ociDetails) {
    const ociMetadata: Metadata = {
      registry: ociDetails.registry,
      secret: ociDetails.secretRef?.name ?? 'none',
    };

    return ociMetadata;
  }

  return {};
};

const getRepositoryMetadata = (repository: Repository): Metadata => {
  const metadata: Metadata = {
    name: repository.metadata.name,
    description: repository.spec.description ?? '',
    content: `${getPackageDescriptor(repository)}s`,
    ...getRepositoryStoreMetadata(repository),
  };

  return metadata;
};

export const RepositoryDetails = ({
  repositorySummary,
}: RepositoryDetailsProps) => {
  const repositoryMetadata = getRepositoryMetadata(
    repositorySummary.repository,
  );

  return (
    <InfoCard title="Repository Details">
      <StructuredMetadataTable metadata={repositoryMetadata} />
    </InfoCard>
  );
};
