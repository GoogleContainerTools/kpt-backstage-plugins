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

import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import requestLibrary from 'request';
import { Logger } from 'winston';
import {
  ClusterLocatorAuthProvider,
  getClusterLocatorMethodAuthProvider,
  getClusterLocatorMethodType,
} from './config';
import { getKubernetesConfig } from './lib';

export interface RouterOptions {
  config: Config;
  logger: Logger;
}

export async function createRouter({
  config,
  logger,
}: RouterOptions): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  const cadConfig = config.getConfig('configAsData');

  const clusterLocatorMethodType = getClusterLocatorMethodType(cadConfig);
  const clusterLocatorMethodAuthProvider =
    getClusterLocatorMethodAuthProvider(cadConfig);

  const kubeConfig = getKubernetesConfig(clusterLocatorMethodType);
  const currentCluster = kubeConfig.getCurrentCluster();

  if (!currentCluster) {
    throw new Error(`Current cluster is not set`);
  }

  const k8sApiServerUrl = currentCluster.server;

  const healthCheck = (
    _: express.Request,
    response: express.Response,
  ): void => {
    response.send({ status: 'ok' });
  };

  const getFeatures = (
    _: express.Request,
    response: express.Response,
  ): void => {
    const authentication =
      clusterLocatorMethodAuthProvider === ClusterLocatorAuthProvider.GOOGLE
        ? 'google'
        : 'none';

    response.send({
      authentication,
    });
  };

  const getFunctionCatalog = (
    _: express.Request,
    response: express.Response,
  ): void => {
    requestLibrary(
      'https://catalog.kpt.dev/catalog-v2.json',
      (error, catalogResponse, catalogBody) => {
        if (error) {
          response.status(500);
        } else {
          response.status(catalogResponse.statusCode);
          response.send(catalogBody);
        }
      },
    );
  };

  const proxyKubernetesRequest = (
    request: express.Request,
    response: express.Response,
  ): void => {
    logger.info(`${request.method} ${request.url}`);

    const requestOptions: requestLibrary.Options = {
      baseUrl: k8sApiServerUrl,
      url: request.url,
      method: request.method,
      body:
        Object.keys(request.body).length === 0
          ? undefined
          : JSON.stringify(request.body),
    };

    kubeConfig.applyToRequest(requestOptions);

    const useEndUserAuthz =
      clusterLocatorMethodAuthProvider !==
      ClusterLocatorAuthProvider.CURRENT_CONTEXT;
    if (useEndUserAuthz) {
      requestOptions.headers = requestOptions.headers ?? {};
      requestOptions.headers.authorization = request.headers.authorization;
    }

    requestLibrary(requestOptions, (k8Error, k8Response, k8Body) => {
      if (k8Error) {
        response.status(500);
      } else {
        response.status(k8Response.statusCode);
        response.send(k8Body);
      }
    });
  };

  router.get('/health', healthCheck);
  router.get('/v1/features', getFeatures);
  router.get('/v1/function-catalog', getFunctionCatalog);

  router.get('/*', proxyKubernetesRequest);
  router.post('/*', proxyKubernetesRequest);
  router.put('/*', proxyKubernetesRequest);
  router.patch('/*', proxyKubernetesRequest);
  router.delete('/*', proxyKubernetesRequest);

  router.use(errorHandler());

  return router;
}
