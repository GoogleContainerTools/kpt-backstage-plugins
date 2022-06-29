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

import { Content, Header, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Alert } from '@material-ui/lab';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import {
  addPackageRouteRef,
  deployPackageRouteRef,
  editPackageRouteRef,
  packageRouteRef,
  registerRepositoryRouteRef,
  repositoryRouteRef,
} from '../../routes';
import { loadFeatures } from '../../utils/featureFlags';
import { AddPackagePage } from '../AddPackagePage';
import { PackageRevisionPage } from '../PackageRevisionPage';
import { PackageRevisionPageMode } from '../PackageRevisionPage/PackageRevisionPage';
import { RegisterRepositoryPage } from '../RegisterRepositoryPage';
import { RepositoryListPage } from '../RepositoryListPage';
import { RepositoryPage } from '../RepositoryPage';

export const LandingPage = () => {
  const api = useApi(configAsDataApiRef);

  const { loading, error } = useAsync(() => loadFeatures(api), []);

  const getContent = (): JSX.Element => {
    if (loading) {
      return <Progress />;
    } else if (error) {
      return <Alert severity="error">{error.message}</Alert>;
    }

    return (
      <Routes>
        <Route path="/" element={<RepositoryListPage />} />
        <Route
          path={registerRepositoryRouteRef.path}
          element={<RegisterRepositoryPage />}
        />
        <Route path={repositoryRouteRef.path} element={<RepositoryPage />} />
        <Route path={addPackageRouteRef.path} element={<AddPackagePage />} />
        <Route
          path={packageRouteRef.path}
          element={<PackageRevisionPage mode={PackageRevisionPageMode.VIEW} />}
        />
        <Route path={deployPackageRouteRef.path} element={<AddPackagePage />} />
        <Route
          path={editPackageRouteRef.path}
          element={<PackageRevisionPage mode={PackageRevisionPageMode.EDIT} />}
        />
      </Routes>
    );
  };

  return (
    <Page themeId="tool">
      <Header title="Configuration as Data" />
      <Content>{getContent()}</Content>
    </Page>
  );
};
