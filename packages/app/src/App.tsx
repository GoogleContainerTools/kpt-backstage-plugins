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

import { UserSettingsPage } from '@backstage/plugin-user-settings';
import React from 'react';
import { Navigate, Route } from 'react-router';
import { apis } from './apis';
import { Root } from './components/Root';

import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, OAuthRequestDialog } from '@backstage/core-components';
import { CatalogEntityPage, CatalogIndexPage } from '@backstage/plugin-catalog';
import { CadPage } from '@kpt/backstage-plugin-cad';

const app = createApp({
  apis,
});

const routes = (
  <FlatRoutes>
    <Navigate key="/" to="config-as-data" />
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    />
    <Route path="/settings" element={<UserSettingsPage />} />
    <Route path="/config-as-data" element={<CadPage />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
