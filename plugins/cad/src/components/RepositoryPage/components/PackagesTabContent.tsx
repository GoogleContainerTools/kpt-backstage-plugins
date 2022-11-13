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

import { Card, CardContent, makeStyles } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import React, { Fragment, useState } from 'react';
import { Function } from '../../../types/Function';
import { Repository, RepositoryContent } from '../../../types/Repository';
import { isConfigSyncEnabled } from '../../../utils/featureFlags';
import {
  filterPackageSummaries,
  PackageSummary,
} from '../../../utils/packageSummary';
import {
  isReadOnlyRepository,
  RepositoryContentDetails,
} from '../../../utils/repository';
import { toLowerCase } from '../../../utils/string';
import { Chip } from '../../Controls';
import { PackagesTable } from '../../PackagesTable';
import { FunctionsTable } from '../components/FunctionsTable';

type PackagesTabContentProps = {
  packageDescriptor: string;
  repositories: Repository[];
  packages: PackageSummary[];
  functions: Function[];
  packagesError?: Error;
  oneRepositoryFocus?: boolean;
};

enum Display {
  ALL = 'all',
  PUBLISHED = 'published',
  PROPOSED = 'proposed',
  UPGRADE = 'upgrade',
  DRAFT = 'draft',
}

const useStyles = makeStyles({
  root: {
    '& > *:not(:last-child)': {
      marginBottom: '16px',
    },
  },
});

const getDisplapyPackages = (
  packages: PackageSummary[],
  display: string,
): PackageSummary[] => {
  switch (display) {
    case Display.PUBLISHED:
      return filterPackageSummaries(packages, { isPublished: true });
    case Display.PROPOSED:
      return filterPackageSummaries(packages, { isProposed: true });
    case Display.UPGRADE:
      return filterPackageSummaries(packages, { isUpgradeAvailable: true });
    case Display.DRAFT:
      return filterPackageSummaries(packages, { isDraft: true });
    default:
      return packages;
  }
};

export const PackagesTabContent = ({
  packageDescriptor,
  repositories,
  packages,
  functions,
  packagesError,
  oneRepositoryFocus,
}: PackagesTabContentProps) => {
  const classes = useStyles();

  const [display, setDisplay] = useState<string>(Display.ALL);

  const getChip = (label: string, value: string): JSX.Element => (
    <Chip
      label={label}
      selected={display === value}
      onClick={() => setDisplay(value)}
    />
  );

  const pluralPackageDescriptor = `${packageDescriptor}s`;
  const pluralPackageDescriptorLowerCase = toLowerCase(pluralPackageDescriptor);

  const isReadOnly =
    repositories.length > 0 && repositories.every(isReadOnlyRepository);

  const contentDetails = RepositoryContentDetails[packageDescriptor];
  const repositoryContent = contentDetails.repositoryContent;
  const showPackagesTable = repositoryContent === RepositoryContent.PACKAGE;
  const showFunctionsTable = repositoryContent === RepositoryContent.FUNCTION;

  const displayPackages = getDisplapyPackages(packages, display);

  if (packagesError) {
    return <Alert severity="error">{packagesError.message}</Alert>;
  }

  return (
    <div className={classes.root}>
      {isReadOnly && (
        <Alert severity="info">
          {oneRepositoryFocus && (
            <Fragment>
              This repository is read-only. You will not be able to add or make
              any changes to the {pluralPackageDescriptorLowerCase} in this
              repository.
            </Fragment>
          )}
          {!oneRepositoryFocus && (
            <Fragment>
              You will not be able to add or make any changes to the{' '}
              {pluralPackageDescriptorLowerCase} since the{' '}
              {pluralPackageDescriptorLowerCase} exist in read-only
              repositories.
            </Fragment>
          )}
        </Alert>
      )}

      {showPackagesTable && (
        <Fragment>
          <Card>
            <CardContent>
              <div>
                {getChip(`Show All ${pluralPackageDescriptor}`, Display.ALL)}
                {getChip('Published', Display.PUBLISHED)}
                {getChip('Upgrade Available', Display.UPGRADE)}
                {getChip('Pending Review', Display.PROPOSED)}
                {getChip('Draft', Display.DRAFT)}
              </div>
            </CardContent>
          </Card>

          <PackagesTable
            title={pluralPackageDescriptor}
            packages={displayPackages}
            showRepositoryColumn={!oneRepositoryFocus}
            showSyncStatusColumn={
              isConfigSyncEnabled() && !!contentDetails.isDeployment
            }
          />
        </Fragment>
      )}
      {showFunctionsTable && (
        <FunctionsTable
          title={pluralPackageDescriptor}
          functions={functions}
          showLatestVersionOnly
        />
      )}
    </div>
  );
};
