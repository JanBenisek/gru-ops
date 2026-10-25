# docker build -t docker-registry.pengiuns.com/repo-worker:0.1.0 .
# docker push docker-registry.pengiuns.com/repo-worker:0.1.0
FROM python:3.12-slim-bookworm

ARG GH_VERSION=2.103.2
ARG TARGETARCH=amd64

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates curl nodejs npm bash \
 && curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${TARGETARCH}.tar.gz" \
      | tar -xz -C /tmp \
 && mv "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}/bin/gh" /usr/local/bin/gh \
 && rm -rf /tmp/gh_* /var/lib/apt/lists/*

RUN useradd --uid 10001 --create-home --home-dir /home/agent agent \
 && mkdir -p /work && chown agent:agent /work

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

ENV HOME=/home/agent WORK_ROOT=/work PYTHONUNBUFFERED=1
USER 10001:10001
EXPOSE 8080
CMD ["python", "app.py"]
