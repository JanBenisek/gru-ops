# Gru

My tiny homelab

## Talos

Let's add the commands later.

## Flux

- [] some pods, like hiker, are not removed when removed from here and reconciled

## KRR
- Adjut usage - https://github.com/robusta-dev/krr
- `z home/krr`
- `source krr/bin/activate`
- `k port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090`
- `python krr.py simple -p http://localhost:9090`

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

### docker-registry

- [Helm Chart](https://github.com/twuni/docker-registry.helm)
- [Docker image](https://hub.docker.com/_/registry)
- [Docs](https://distribution.github.io/distribution/)
- interact with registry:
  - [API](https://distribution.github.io/distribution/spec/api/)
```shell
curl -X GET https://docker-registry.pengiuns.com/v2/_catalog?n=1000
curl -X GET https://docker-registry.pengiuns.com/v2/vllm/tags/list

# add image 
docker tag vllm:cpu docker-registry.pengiuns.com/vllm:cpu
docker push docker-registry.pengiuns.com/vllm:cpu

# remove locally
docker image remove docker-registry.pengiuns.com/vllm:cpu

# pull again
docker pull docker-registry.pengiuns.com/vllm:cpu

# remove from storage
curl -sS -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
-o /dev/null \
-w '%header{Docker-Content-Digest}' \
https://docker-registry.pengiuns.com/v2/vllm/manifests/latest

curl -X DELETE https://docker-registry.pengiuns.com/v2/my-nginx/manifests/sha256:c9f91949187fa1c2b4615b88d3acf7902c7e2d4a2557f33ca0cf90164269a7ae
```
- [Garbage Collection](https://distribution.github.io/distribution/about/garbage-collection/)
  - in container: `registry garbage-collect -m /etc/docker/registry/config.yml --delete-untagged --dry-run`
  - it removes blobs which stay around after removing image or tag
- Useful
  - https://kb.leaseweb.com/kb/kubernetes/kubernetes-deploying-a-docker-registry-on-kubernetes/
  - https://medium.com/geekculture/deploying-docker-registry-on-kubernetes-3319622b8f32
  - https://www.paulsblog.dev/how-to-install-a-private-docker-container-registry-in-kubernetes/


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

### harbor

- Store containers
- [values](https://github.com/goharbor/harbor-helm?tab=readme-ov-file)
- [docs](https://goharbor.io/docs/1.10/install-config/harbor-ha-helm/)
- [helm](https://github.com/goharbor/harbor-operator/blob/main/docs/installation/by-helm-chart.md)

### hiker

- Just an experiment, try to add endpoints for Grafana to monitor?

### homepage

- Homepage for all tools [source](https://gethomepage.dev/).
- [List of icons](https://github.com/walkxcode/dashboard-icons)

### ingress-nginx

- Ingress, works like a charm.
- [values.yaml](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)

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
  - https://github.com/digitalocean/Kubernetes-Starter-Kit-Developers/blob/main/04-setup-observability/loki-stack.md
  - https://github.com/digitalocean/Kubernetes-Starter-Kit-Developers/blob/main/04-setup-observability/prometheus-stack.md
- `loki`
  - `loki` seems to be recommended now, as opposed to `loki-stack`
  - [values](https://artifacthub.io/packages/helm/grafana/loki)
  - https://community.grafana.com/t/difference-between-helm-charts-loki-and-loki-stack/87380/8
  - https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
  - https://fluxcd.io/flux/monitoring/metrics/
  - https://github.com/grafana/helm-charts/tree/main/charts/loki

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

### Ray

- [Docs](https://docs.ray.io/en/latest/cluster/kubernetes/getting-started/raycluster-quick-start.html)
- https://github.com/ray-project/kuberay/blob/master/helm-chart/ray-cluster/README.md
- [operator values.yaml](https://github.com/ray-project/kuberay/blob/master/helm-chart/kuberay-operator/values.yaml)
- [cluster  values.yaml](https://github.com/ray-project/kuberay/blob/master/helm-chart/ray-cluster/values.yaml) 
- Options
  - RayCluster: When you want a persistent Ray cluster that can run multiple workloads over time.
  - RayJob: When you just need to run a single job and don’t need a persistent cluster.
  - RayService: When you want to deploy a long-running, scalable service like an AI inference API.

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

### vllm

- [vllm](https://docs.vllm.ai/en/latest/deployment/integrations/production-stack.html)
- [docs](https://blog.vllm.ai/production-stack/deployment/helm.html)
- [values.yaml](https://github.com/vllm-project/production-stack/blob/main/helm/values.yaml)
- [supported models](https://docs.vllm.ai/en/latest/models/supported_models.html)

```shell
curl https://vllm.pengiuns.com/v1/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "facebook/opt-125m",
        "prompt": "what is 3+3",
        "max_tokens": 1900,
        "temperature": 0
    }'
```

## Archive

### NFS

- NFS: Based on this [OpenEBS](https://openebs.io/docs/Solutioning/read-write-many/nfspvc)

### Harbor

- Store my containers.
- [Helm](https://artifacthub.io/packages/helm/bitnami/harbor)
- [Helm values](https://github.com/bitnami/charts/blob/main/bitnami/harbor/values.yaml)