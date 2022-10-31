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

import {
  createApiFactory,
  createPlugin,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
  googleAuthApiRef,
  oktaAuthApiRef,
} from '@backstage/core-plugin-api';
import { configAsDataApiRef, PorchRestAPI } from './apis';
import { rootRouteRef } from './routes';

export const cadPlugin = createPlugin({
  id: 'config-as-data',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: configAsDataApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        googleAuthApi: googleAuthApiRef,
        oktaAuthApi: oktaAuthApiRef,
      },
      factory: ({ discoveryApi, fetchApi, googleAuthApi, oktaAuthApi }) =>
        new PorchRestAPI(discoveryApi, fetchApi, googleAuthApi, oktaAuthApi),
    }),
  ],
});

export const CadPage = cadPlugin.provide(
  createRoutableExtension({
    name: 'config-as-data',
    component: () =>
      import('./components/LandingPage').then(m => m.LandingPage),
    mountPoint: rootRouteRef,
  }),
);
