# Configuration as Data Backend Plugin

Welcome to the Configuration as Data backend plugin!

## Installation

### Adding the plugin

Navigate to `packages/backend` of your Backstage app, and install the
`@kpt/backstage-plugin-cad-backend` package.

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @kpt/backstage-plugin-cad-backend
```

Next, you'll need to add the plugin to the router in your `backend` package. You
can do this by creating a file called `packages/backend/src/plugins/cad.ts`

```tsx
import { createRouter } from '@kpt/backstage-plugin-cad-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    config: env.config,
    logger: env.logger,
  });
}
```

With the `cad.ts` router setup in place, add the router to
`packages/backend/src/index.ts`:

```ts
import cad from './plugins/cad';
// ...

async function main() {
  // ...
  const cadEnv = useHotMemoize(module, () => createEnv('cad'));

  // ...
  apiRouter.use('/config-as-data', await cad(cadEnv));
```

### Configuration

The following configuration will need to be added to `app-config.yaml`:

```yaml
configAsData:
  clusterLocatorMethod:
    # Determines how the client will locate the Kubernetes cluster.
    #
    # values:
    #   'current-context' uses kubeconfig current context to locate the cluster
    #   'in-cluster' uses the same cluster that Backstage is running in
    type: current-context

    # Determines how the client will authenticate with the Kubernetes cluster.
    #
    # values:
    #   'current-context' uses the same user as set by kubeconfig current context
    #   'google' uses the current user's Google auth token
    authProvider: current-context
```

`clusterLocatorMethod` determines where to receive the cluster configuration
from

`clusterLocatorMethod.type` determines how the cluster will be located

Valid values:
| Values | Description |
| ------ | ----------- |
| current-context | Connect to the cluster as defined by the kubeconfig current context |
| in-cluster | Connect to the same cluster that Backstage is running in |

`clusterLocatorMethod.authProvider` determines how the client will authenticate
with the cluster.

Valid values:
| Values | Description |
| ------ | ----------- |
| current-context | Authenticate to the cluster with the user in the kubeconfig current context |
| google | Authenticate to the cluster using the user's authentication token from the [Google auth plugin](https://backstage.io/docs/auth/) |
