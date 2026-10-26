#!/bin/bash
# Build and push the Ayakaleaf Pro image (Pro + full TeX Live) to the private registry.
# Usage:
#   ./build.sh                              # defaults: 6.3.2, scheme-full
#   AYAKALEAF_VERSION=6.4.0 ./build.sh
#   TEXLIVE_SCHEME=scheme-medium ./build.sh # smaller (~1-2GB) TeX Live
set -euo pipefail

AYAKALEAF_VERSION="${AYAKALEAF_VERSION:-6.3.2}"
TEXLIVE_SCHEME="${TEXLIVE_SCHEME:-scheme-full}"
IMAGE="docker-registry.pengiuns.com/ayakaleaf-pro:${AYAKALEAF_VERSION}-${TEXLIVE_SCHEME}"

cd "$(dirname "$0")"
echo "Building ${IMAGE} (Ayakaleaf Pro ${AYAKALEAF_VERSION}, ${TEXLIVE_SCHEME})..."
docker build \
  --build-arg AYAKALEAF_VERSION="${AYAKALEAF_VERSION}" \
  --build-arg TEXLIVE_SCHEME="${TEXLIVE_SCHEME}" \
  -t "${IMAGE}" .
docker push "${IMAGE}"
echo "Pushed ${IMAGE}"
