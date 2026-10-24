#!/bin/bash
# Build and push the overleaf image (Overleaf + full TeX Live) to the private registry.
# Usage:
#   ./build.sh                              # defaults: 6.3.0, scheme-full
#   OVERLEAF_VERSION=6.4.0 ./build.sh
#   TEXLIVE_SCHEME=scheme-medium ./build.sh # smaller (~1-2GB) TeX Live
set -euo pipefail

OVERLEAF_VERSION="${OVERLEAF_VERSION:-6.3.0}"
TEXLIVE_SCHEME="${TEXLIVE_SCHEME:-scheme-full}"
IMAGE="docker-registry.pengiuns.com/overleaf:${OVERLEAF_VERSION}"

cd "$(dirname "$0")"
echo "Building ${IMAGE} (Overleaf ${OVERLEAF_VERSION}, ${TEXLIVE_SCHEME})..."
docker build \
  --build-arg OVERLEAF_VERSION="${OVERLEAF_VERSION}" \
  --build-arg TEXLIVE_SCHEME="${TEXLIVE_SCHEME}" \
  -t "${IMAGE}" .
docker push "${IMAGE}"
echo "Pushed ${IMAGE}"
