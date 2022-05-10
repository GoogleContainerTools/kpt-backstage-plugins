# Configuration as Data Plugin

Welcome to the Configuration as Data plugin! This plugin powers the WYSIWYG
Configuration GUI over GitOps using [kpt](https://kpt.dev/) and its new
Package Orchestrator,
[porch](https://github.com/GoogleContainerTools/kpt/tree/main/porch).

_New to Configuration as Data?_

_Configuration as Data_ is an approach to management of configuration (incl.
configuration of infrastructure, policy, services, applications, etc.) which:

- makes configuration data the source of truth, stored separately from the
  live state
- uses a uniform, serializable data model to represent configuration
- separates code that acts on the configuration from the data and from
  packages / bundles of the data
- abstracts configuration file structure and storage from operations that act
  upon the configuration data; clients manipulating configuration data don’t
  need to directly interact with storage (git, container images)

Read
[Configuration as Data Design Document](https://github.com/GoogleContainerTools/kpt/blob/main/docs/design-docs/06-config-as-data.md)
to learn more.

## Installation

To install Configuration as Data Plugin to Backstage, you will need to install
both the Frontend and Backend plugins. Once completed, you will be able to
access the UI by browsing to `/config-as-data`.

### Adding the frontend plugin

The first step is to add the Configuration as Data plugin to your Backstage
application.

```bash
# From your Backstage root directory
yarn add --cwd packages/app @kpt/backstage-plugin-cad
```

Once the package is installed, import the plugin in your app by adding the
`config-as-data` route to `App.tsx`.

```tsx
import { CadPage } from '@kpt/backstage-plugin-cad';
// ...

const routes = (
  <FlatRoutes>
    // ...
    <Route path="/config-as-data" element={<CadPage />} />
  </FlatRoutes>
);
```

### Adding the backend plugin

Add and configure the [cad-backend](../cad-backend) plugin according to its
instructions.

### Optional: Adding a link to the plugin on the Sidebar

Add a link to the Sidebar to easily access Configuration as Data. In
`packages/app/src/components/Root.tsx` add:

```tsx
import LibraryBooks from '@material-ui/icons/LibraryBooks';

<SidebarScrollWrapper>
  <SidebarItem icon={LibraryBooks} to="config-as-data" text="Config as Data" />
  // Other sidebar items...
</SidebarScrollWrapper>;
```
