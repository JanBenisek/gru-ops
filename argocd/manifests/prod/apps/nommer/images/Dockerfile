# nommer: allergen tracker (FastAPI + static frontend)
#
# Build & push (see build.sh):
#   ./build.sh                 # uses VERSION from build.sh
#
# New version: bump VERSION in build.sh, run ./build.sh, then update the image
# tag in ../deployment.yaml. Renovate ignores docker-registry.pengiuns.com,
# so this bump is manual.
FROM python:3.13-slim

ARG NOMMER_VERSION=dev

ENV NOMMER_VERSION=${NOMMER_VERSION} \
    NOMMER_DATA_FILE=/data/nommer.json \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN mkdir /data && chown 1000:1000 /data

USER 1000:1000
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
