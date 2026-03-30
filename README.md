# Gru

My tiny homelab

## TO-DOs

- [] the library for secret replication has been archived, find a replacement
- [] better way to manage secrets, use sops / sealed whatever
- [] hiker is not removed when removed from here and reconcilled

## DNS rebinding attack

- https://www.reddit.com/r/homelab/comments/qty1an/public_dns_record_pointing_to_private_ip_address/
- https://www.reddit.com/r/homelab/comments/17h16g7/cloudflare_dns_pointed_to_internal_ip_address_safe/


## Apps

### cert-manager

- Need to have cloudflare secret

```shell
k create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --dry-run=client \
  --from-literal=cloudflare_api_token=<SECRET> -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /Users/janbenisek/GithubRepos/gru-ops/gitops/manifests/cert-manager/certs/cloudflare-api-token.yaml
```

### external-dns

- Need to have cloudflare secret (sealed).
- Follow the procedure in `sealed secrets`, then

```shell
k create secret generic cloudflare-api-token \
  --namespace external-dns \
  --dry-run=client \
  --from-literal=cloudflare_api_token=<SECRET> -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /Users/janbenisek/GithubRepos/gru-ops/gitops/manifests/external-dns/cloudflare-api-token.yaml
```

### hiker

- Just an experiment, try to add endpoints for Grafana to monitor?

### ingress-nginx

- Ingress, works like a charm.

### metallb

- Load Balancer, pay attention to DHCP range!

### monitoring

- Note that it takes a while for all the resources to start! Some might need delete.
- `kube-promehteus-stack` (Grafana)
  - https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
  - https://artifacthub.io/packages/helm/grafana/loki-stack 
  - https://github.com/digitalocean/Kubernetes-Starter-Kit-Developers/blob/main/04-setup-observability/loki-stack.md
  - https://github.com/digitalocean/Kubernetes-Starter-Kit-Developers/blob/main/04-setup-observability/prometheus-stack.md
- `loki-stack`
  - https://artifacthub.io/packages/helm/grafana/grafana
  - https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
  - https://fluxcd.io/flux/monitoring/metrics/

### sealed secrets

- Create my own keys. Pod needs to be rebooted

```shell
export PRIVATEKEY="sealed-secrets-private.key"
export PUBLICKEY="sealed-secrets-public.crt"
export NAMESPACE="sealed-secrets"
export SECRETNAME="my-sealed-secrets-certs"

-- valid for 2yrs
openssl req -x509 -days 730 -nodes -newkey rsa:4096 -keyout "$PRIVATEKEY" -out "$PUBLICKEY" -subj "/CN=sealed-secret/O=sealed-secret"

k -n "$NAMESPACE" create secret tls "$SECRETNAME" --cert="$PUBLICKEY" --key="$PRIVATEKEY"
k -n "$NAMESPACE" label secret "$SECRETNAME" sealedsecrets.bitnami.com/sealed-secrets-key=active
```

- readings
  - https://geek-cookbook.funkypenguin.co.nz/kubernetes/sealed-secrets/
  - https://github.com/bitnami-labs/sealed-secrets/blob/main/docs/bring-your-own-certificates.md

### secret-replicator

- replace by something more modern with better features, like removing/replacing old secrets
- it looks for `contains` secrets to replicate

### stirling

- set up some configs and use FAT version
- https://github.com/Stirling-Tools/Stirling-PDF/blob/main/Version-groups.md
- https://github.com/Stirling-Tools/Stirling-PDF?tab=readme-ov-file