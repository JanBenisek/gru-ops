# Ayakaleaf Pro with full TeX Live (official image only ships scheme-basic)
#
# Build & push (defaults: 6.3.2, scheme-full):
#   ./build.sh
#
# New Pro version: bump AYAKALEAF_VERSION below (and the default in build.sh),
# run ./build.sh, then update the image tag in ../deployment.yaml.
# Renovate ignores docker-registry.pengiuns.com images, so this bump is always manual.
ARG AYAKALEAF_VERSION=6.3.2
FROM ghcr.io/ayaka-notes/overleaf-pro:${AYAKALEAF_VERSION}

ARG TEXLIVE_SCHEME=scheme-full
RUN tlmgr update --self \
    && tlmgr install ${TEXLIVE_SCHEME}
