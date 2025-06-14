# docker build -t docker-registry.pengiuns.com/jupyter-minimal:latest .
# docker push docker-registry.pengiuns.com/jupyter-minimal:latest
FROM quay.io/jupyter/minimal-notebook:7830074b9e0a AS base

# Install system packages: vim and htop
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim \
    htop \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch back to the default notebook user
USER $NB_UID
