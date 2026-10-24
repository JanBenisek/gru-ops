# Overleaf with full TeX Live (official image only ships scheme-basic)
#
# Build & push (defaults: OVERLEAF_VERSION=6.3.0, scheme-full):
#   ./build.sh
#
# New Overleaf version: bump OVERLEAF_VERSION below (and the tag the image
# gets in build.sh), run ./build.sh, then update the image tag in
# ../deployment.yaml. Renovate ignores docker-registry.pengiuns.com images,
# so this bump is always manual.
ARG OVERLEAF_VERSION=6.3.0
FROM sharelatex/sharelatex:${OVERLEAF_VERSION}

ARG TEXLIVE_SCHEME=scheme-full
RUN tlmgr update --self \
    && tlmgr install ${TEXLIVE_SCHEME} \
    && rm -rf /var/lib/apt/lists/*
