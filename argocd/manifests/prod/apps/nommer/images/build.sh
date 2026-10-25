#!/bin/bash
# Build and push the nommer image to the private registry.
# Usage:
#   ./build.sh                 # uses VERSION below
#   VERSION=0.2.0 ./build.sh   # override for a one-off build (bump the default when releasing)
set -euo pipefail

VERSION="${VERSION:-0.1.0}"
IMAGE="docker-registry.pengiuns.com/nommer:${VERSION}"

cd "$(dirname "$0")"
echo "Building ${IMAGE}..."
docker build --platform linux/amd64 \
  --build-arg NOMMER_VERSION="${VERSION}" \
  -t "${IMAGE}" .
docker push "${IMAGE}"
echo "Pushed ${IMAGE}"
