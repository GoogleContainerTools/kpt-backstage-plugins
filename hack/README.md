# Hack Directory

This directory contains scripts to aid in the development of the kpt Backstage
Plugins.

## Prerequisites

Depending on the script you are executing, you must have
[kind](https://kind.sigs.k8s.io),
[kubectl](https://kubernetes.io/docs/tasks/tools), and
[jq](https://stedolan.github.io/jq) installed.

## Key Scripts

- [create-kind-cluster.sh](create-kind-cluster.sh): Creates a ready to use dev
  kind cluster with Porch and example package repositories already installed

- [install-porch.sh](install-porch.sh): Installs the latest Porch release on the
  cluster `kubectl` is targetting

- [install-package-repositories.sh](install-package-repositories.sh): Installs
  example package repositories on the cluster `kubectl` is targetting
