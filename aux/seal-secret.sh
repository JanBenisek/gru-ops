#!/bin/bash

# Script to create sealed secrets
# Usage: ./create-sealed-secret.sh <secret-name> <namespace> <key=value> <relative-path>
#
# Example:
# ./aux/seal-secret.sh cloudflare-api-token external-dns apiKey=SECRET prod/infra/external-dns
# Creates: /Users/janbenisek/github/gru-ops/argocd/manifests/prod/infra/external-dns/cloudflare-api-token.yaml

set -e

if [ $# -lt 4 ]; then
    echo "Usage: $0 <secret-name> <namespace> <key=value> <relative-path>"
    echo "Example: $0 cloudflare-api-token external-dns apiKey=your-token prod/infra/external-dns"
    exit 1
fi

SECRET_NAME="$1"
NAMESPACE="$2"
KEY_VALUE="$3"
RELATIVE_PATH="$4"

# Hardcoded base path
BASE_PATH="/Users/janbenisek/github/gru-ops/argocd/manifests"
OUTPUT_PATH="${BASE_PATH}/${RELATIVE_PATH}/${SECRET_NAME}.yaml"

# Create directory if it doesn't exist
mkdir -p "${BASE_PATH}/${RELATIVE_PATH}"

# Check for required files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLICKEY="${SCRIPT_DIR}/sealed-secrets-public.crt"

if [ ! -f "$PUBLICKEY" ]; then
    echo "Error: Public key not found at $PUBLICKEY"
    exit 1
fi

echo "Creating sealed secret: $SECRET_NAME"
echo "Namespace: $NAMESPACE"
echo "Key-Value: $KEY_VALUE"
echo "Output: $OUTPUT_PATH"

# Create the sealed secret
kubectl create secret generic "$SECRET_NAME" \
    --namespace "$NAMESPACE" \
    --dry-run=client \
    --from-literal="$KEY_VALUE" -o json \
    | kubeseal --cert "$PUBLICKEY" \
    > "$OUTPUT_PATH"

echo "Sealed secret created at: $OUTPUT_PATH"