# Gru

My tiny homelab

## Talos

Let's add the commands later.

## Flux

- [] some pods, like hiker, are not removed when removed from here and reconciled

## Apps

### cert-manager

- Need to have cloudflare secret

```shell
k create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --dry-run=client \
  --from-literal=cloudflare_api_token=<SECRET> -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /Users/janbenisek/GithubRepos/gru-ops/gitops/manifests/cert-manager/secrets/cloudflare-api-token.yaml
```

### Cloudflare

- To be able to expose my services on the internet.
- I need to set up the tunnel in cloudflare and add CNAME pointing to `acdf4147-512c-4b16-8ce2-58915c6ab118.cfargotunnel.com` with the orange cloud on.
- [values](https://github.com/cloudflare/helm-charts/blob/main/charts/cloudflare-tunnel/values.yaml)
- [docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

### external-dns

- Need to have cloudflare secret (sealed).
- Follow the procedure in `sealed secrets`, then

```shell
k create secret generic cloudflare-api-token \
  --namespace external-dns \
  --dry-run=client \
  --from-literal=cloudflare_api_token=DVzmh9hcRb_l9pmZrvXpPWFP7Ym67EP3yXqJX8n8 -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /Users/janbenisek/GithubRepos/gru-ops/gitops/manifests/external-dns/secrets/cloudflare-api-token.yaml
```

### hiker

- Just an experiment, try to add endpoints for Grafana to monitor?

### homepage

- Homepage for all tools [source](https://gethomepage.dev/).
- [List of icons](https://github.com/walkxcode/dashboard-icons)

### ingress-nginx

- Ingress, works like a charm.

### it-tools

- Set of interesting IT tools.

### jupyter

- [docs](https://z2jh.jupyter.org/en/stable/jupyterhub/installation.html)
- [images](https://github.com/jupyter/docker-stacks/tree/main/images)
- [repo](https://github.com/jupyterhub/zero-to-jupyterhub-k8s)
- [values](https://github.com/jupyterhub/zero-to-jupyterhub-k8s/blob/HEAD/jupyterhub/values.yaml)
- [refrence](https://z2jh.jupyter.org/en/latest/resources/reference.html)

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

### ollama

- LLMs!
- [Helm](https://github.com/otwld/ollama-helm)
- [Helm value](https://artifacthub.io/packages/helm/ollama-helm/ollama/0.67.0?modal=values)
- [Github](https://github.com/ollama/ollama?tab=readme-ov-file)

- Interact with the REST API:
- [Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)

```shell
# chat
curl https://ollama.pengiuns.com/api/chat -d '{"model": "llama3.2", "stream": false, "messages": [{ "role": "user", "content": "why is the sky blue?" }]}'

# pull model
curl https://ollama.pengiuns.com/api/pull -d '{"model": "gemma2"}'

# remove model
curl -X DELETE https://ollama.pengiuns.com/api/delete -d '{"model": "gemma2:latest"}'

# list models
curl https://ollama.pengiuns.com/api/tags

# list running models
curl https://ollama.pengiuns.com/api/ps
```

### open-webui

- Web interface for LLMs
- [Github](https://github.com/open-webui/open-webui)
- [Helm](https://artifacthub.io/packages/helm/open-webui/open-webui)
- Needs `k label pod open-webui-0 app.kubernetes.io/name=open-webui -n open-webui` otherwise not seen by Homepage.

### openebs

- Storage - see Notion
- values:
  - [main](https://github.com/openebs/openebs/blob/main/charts/values.yaml)
  - [mayastor](https://github.com/openebs/mayastor-extensions/blob/v2.7.1/chart/values.yaml)

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

- [] the library for secret replication has been archived, find a replacement
- it looks for `contains` secrets to replicate

### stirling

- set up some configs and use FAT version
- https://github.com/Stirling-Tools/Stirling-PDF/blob/main/Version-groups.md
- https://github.com/Stirling-Tools/Stirling-PDF?tab=readme-ov-file

## Archive

### NFS

- NFS: Based on this [OpenEBS](https://openebs.io/docs/Solutioning/read-write-many/nfspvc)

### Harbor

- Store my containers.
- [Helm](https://artifacthub.io/packages/helm/bitnami/harbor)
- [Helm values](https://github.com/bitnami/charts/blob/main/bitnami/harbor/values.yaml)