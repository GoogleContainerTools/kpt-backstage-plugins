# Kpt Backstage Plugins

This repository contains the Kpt Backstage Plugins. The plugins can be installed
into an existing Backstage Application following the READMEs for each plugin.
For development and testing, the plugins can also be executed with the example
Backstage Application in this repository.

[Configuration as Data](plugins/cad) is the primary plugin which powers the
WYSIWYG Configuration GUI over GitOps using [kpt](https://kpt.dev/) and its new
Package Orchestrator,
[porch](https://github.com/GoogleContainerTools/kpt/tree/main/porch).

_New to kpt?_

kpt is a package-centric toolchain that enables a WYSIWYG configuration
authoring, automation, and delivery experience, which simplifies managing
Kubernetes platforms and KRM-driven infrastructure at scale by manipulating
declarative Configuration as Data, separated from the code that transforms it.
Read [kpt.dev](https://kpt.dev/) to learn more.

_New to Backstage?_

Backstage is an open platform for building developer portals. Watch
[What is Backstage? (Explainer Video) on YouTube](https://www.youtube.com/watch?v=85TQEpNCaU0)
and read [backstage.io](https://backstage.io) to learn more.

## Quick Start

### Prerequisites

To use the Backstage Application in this repository, you will need:

- [Node.js](https://nodejs.org/)
  [Active LTS Release](https://nodejs.org/en/about/releases/) installed
- [yarn](https://classic.yarnpkg.com/en/docs/install) installed
- [git](https://github.com/git-guides/install-git) installed
- [Porch (Package Orchestration Server)](https://github.com/GoogleContainerTools/kpt/tree/main/porch)
  installed on a
  [Google Kubernetes Engine (GKE)](https://github.com/GoogleContainerTools/kpt/blob/main/site/guides/porch-installation.md)
  cluster
- The latest
  [Config Management Operator manifest](https://cloud.google.com/anthos-config-management/docs/downloads)
  applied to the cluster

### Clone Repository

```bash
git clone https://github.com/GoogleContainerTools/kpt-backstage-plugins.git kpt-backstage-plugins
cd kpt-backstage-plugins
```

### Install Dependencies

```bash
yarn install
```

### Running the Backstage Application

```bash
yarn dev
```

## Contributing

If you are interested in contributing please start with
[contribution guidelines](CONTRIBUTING.md).
