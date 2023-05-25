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

export interface Config {
  /**
   * Configuration for the Configuration as Data Plugin.
   */
  configAsData?: {
    /**
     * The namespace where Porch managed resources live.
     */
    resourcesNamespace: string;

    /**
     * Determines the GitOps delivery tool to use.
     */
    gitOpsDeliveryTool: 'none' | 'config-sync';

    /**
     * Optional. Determines the maximum http request body size.
     */
    maxRequestSize?: string;

    /**
     * Determines where to receive the cluster configuration from.
     */
    clusterLocatorMethod: {
      /**
       * Determines how the client will locate the Kubernetes cluster.
       */
      type: 'current-context' | 'in-cluster';

      /**
       * Determines how the client will authenticate with the Kubernetes cluster.
       */
      authProvider: 'current-context' | 'google' | 'oidc' | 'service-account';

      /**
       * Optional. Determines the OIDC token provider to use when using the 'oidc' auth provider.
       */
      oidcTokenProvider?: 'google' | 'okta';

      /**
       * Optional. The service account token to be used when using the 'service-account' auth provider.
       */
      serviceAccountToken?: string;
    };

    /**
     * Optional. Overrides the sidebar title.
     * @visibility frontend
     */
    sidebarTitle?: string;

    /**
     * Optional. Overrides the branding.
     * @visibility frontend
     */
    branding?: {
      /**
       * Optional. Overrides the title of the plugin.
       * @visibility frontend
       */
      title?: string;

      /**
       * Optional. Overrides the plugin's header.
       * @visibility frontend
       */
      header?: {
        /**
         * Optional. Sets the logo.
         * @visibility frontend
         */
        logoUrl?: string;

        /**
         * Optional. Sets the background image.
         * @visibility frontend
         */
        backgroundImageUrl?: string;
      };
    };
  };
}
