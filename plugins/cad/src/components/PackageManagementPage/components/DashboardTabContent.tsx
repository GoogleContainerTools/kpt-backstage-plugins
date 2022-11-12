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

import { makeStyles } from '@material-ui/core';
import { flatten, groupBy } from 'lodash';
import React from 'react';
import { RepositorySummary } from '../../../types/RepositorySummary';
import {
  getPackageDescriptor,
  PackageContentSummaryOrder,
} from '../../../utils/repository';
import { ContentInfoCard } from './ContentInfoCard';

type DashboardTabContentProps = {
  summaries: RepositorySummary[];
};

export const useStyles = makeStyles({
  summaryList: {
    '& > *:not(:first-child)': {
      marginTop: '40px',
    },
  },

  cards: {
    display: 'flex',
    flexFlow: 'wrap',
    '& > *': {
      minWidth: '500px',
      maxWidth: '800px',
      flex: 1,
      margin: '0 16px 16px 0',
    },
  },
});

const getDescriptor = (summary: RepositorySummary): string =>
  getPackageDescriptor(summary.repository);

export const DashboardTabContent = ({
  summaries,
}: DashboardTabContentProps) => {
  const classes = useStyles();

  const repositoriesByContentType = groupBy(summaries, getDescriptor);

  return (
    <div className={classes.cards}>
      {PackageContentSummaryOrder.map(contentType => {
        const contentRepositories =
          repositoriesByContentType[contentType] || [];
        const packageSummaries = flatten(
          contentRepositories.map(r => r.packageSummaries || []),
        );
        const repositories = contentRepositories.map(
          repository => repository.repository,
        );

        return (
          <ContentInfoCard
            key={contentType}
            contentType={contentType}
            repositories={repositories}
            packages={packageSummaries}
          />
        );
      })}
    </div>
  );
};
