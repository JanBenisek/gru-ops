#!/bin/bash

# Script to create sealed secrets
# Usage: ./create-sealed-secret.sh <secret-name> <namespace> <key=value> <relative-path> [optional-key=value]
#
# Example:
# ./aux/seal-secret.sh cloudflare-api-token external-dns apiKey=SECRET prod/infra/external-dns
# ./aux/seal-secret.sh cloudflare-api-token external-dns apiKey=SECRET prod/infra/external-dns email=user@domain.com
# Creates: /Users/janbenisek/github/gru-ops/argocd/manifests/prod/infra/external-dns/cloudflare-api-token.yaml

set -e

if [ $# -lt 4 ]; then
    echo "Usage: $0 <secret-name> <namespace> <key=value> <relative-path> [optional-key=value]"
    echo "Example: $0 cloudflare-api-token external-dns apiKey=your-token prod/infra/external-dns"
    echo "Example: $0 cloudflare-api-token external-dns apiKey=your-token prod/infra/external-dns email=user@domain.com"
    exit 1
fi

SECRET_NAME="$1"
NAMESPACE="$2"
KEY_VALUE="$3"
RELATIVE_PATH="$4"
OPTIONAL_KEY_VALUE="$5"

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
if [ -n "$OPTIONAL_KEY_VALUE" ]; then
    echo "Optional Key-Value: $OPTIONAL_KEY_VALUE"
fi
echo "Output: $OUTPUT_PATH"

# Create the sealed secret
if [ -n "$OPTIONAL_KEY_VALUE" ]; then
    kubectl create secret generic "$SECRET_NAME" \
        --namespace "$NAMESPACE" \
        --dry-run=client \
        --from-literal="$KEY_VALUE" \
        --from-literal="$OPTIONAL_KEY_VALUE" -o json \
        | kubeseal --cert "$PUBLICKEY" \
        > "$OUTPUT_PATH"
else
    kubectl create secret generic "$SECRET_NAME" \
        --namespace "$NAMESPACE" \
        --dry-run=client \
        --from-literal="$KEY_VALUE" -o json \
        | kubeseal --cert "$PUBLICKEY" \
        > "$OUTPUT_PATH"
fi

echo "Sealed secret created at: $OUTPUT_PATH"