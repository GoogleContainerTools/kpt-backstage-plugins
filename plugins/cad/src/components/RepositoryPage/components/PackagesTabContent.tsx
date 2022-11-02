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

import Alert from '@material-ui/lab/Alert';
import React, { Fragment } from 'react';
import { Function } from '../../../types/Function';
import { Repository } from '../../../types/Repository';
import { PackageSummary } from '../../../utils/packageSummary';
import {
  getPackageDescriptor,
  isDeploymentRepository,
  isFunctionRepository,
  isPackageRepository,
} from '../../../utils/repository';
import { PackagesTable } from '../../PackagesTable';
import { FunctionsTable } from '../components/FunctionsTable';

type PackagesTabContentProps = {
  repository: Repository;
  packages: PackageSummary[];
  functions: Function[];
  packagesError?: Error;
};

export const PackagesTabContent = ({
  repository,
  packages,
  functions,
  packagesError,
}: PackagesTabContentProps) => {
  const pluralPackageDescriptor = `${getPackageDescriptor(repository)}s`;

  if (packagesError) {
    return <Alert severity="error">{packagesError.message}</Alert>;
  }

  return (
    <Fragment>
      {isPackageRepository(repository) && (
        <PackagesTable
          title={pluralPackageDescriptor}
          packages={packages}
          showSyncStatusColumn={isDeploymentRepository(repository)}
        />
      )}

      {isFunctionRepository(repository) && (
        <FunctionsTable
          title={pluralPackageDescriptor}
          functions={functions}
          showLatestVersionOnly
        />
      )}
    </Fragment>
  );
};
