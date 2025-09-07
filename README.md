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

### cnpg
- Because immich needs `VectorChord` extension which is too hard to install in bitnami chart.
  - [VectorChord Github](https://github.com/tensorchord/VectorChord/)

- I went with `Cluster` deployment, seems easier.
  - [Values - crds](https://artifacthub.io/packages/helm/cloudnative-pg/cloudnative-pg)
  - [Values - cluster](https://artifacthub.io/packages/helm/cloudnative-pg/cluster)
  - [Docs](https://cloudnative-pg.io/documentation/1.24/installation_upgrade/)
  - [CloudNative Chart](https://github.com/cloudnative-pg/charts)
  - [Getting Started](https://github.com/cloudnative-pg/charts/blob/main/charts/cluster/docs/Getting%20Started.md)
- Immich related
  - [example](https://gist.github.com/kabakaev/1d8fa31d4e7fa8134c968101fa88d200)

- sealed secrets
```shell
export PUBLICKEY="sealed-secrets-public.crt"

k create secret generic bot-immich-pswd \
  --namespace immich \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=bot_immich \
  --from-literal=password=<secret> \
  --dry-run=client -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/immich/cnpg/bot_immich_pswd.yaml
```
```shell
export PUBLICKEY="sealed-secrets-public.crt"

k create secret generic superuser-pswd \
  --namespace cnpg \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=postgres \
  --from-literal=password=<pswd> \
  --dry-run=client -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/cnpg/cluster/superuser-pswd.yaml
```



### Collabora
- [GitHub](https://github.com/CollaboraOnline/online)
- [Helm Chart](https://artifacthub.io/packages/helm/collabora-online/collabora-online)
- [Values](https://github.com/CollaboraOnline/online/blob/master/kubernetes/helm/collabora-online/values.yaml)

### Cloudflare

- To be able to expose my services on the internet.
- I chose "remote" version - I create the tunnel in the UI and just connect to it.
- [values](https://github.com/cloudflare/helm-charts/blob/main/charts/cloudflare-tunnel-remote/values.yaml)
- [docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- `tunel_token`
  - it seems like it must be named `tunnelToken`, then it should be picked up, based on the chart
```shell
k create secret generic cloudflare-tunnel-cloudflare-tunnel-remote \
  --namespace cloudflare \
  --dry-run=client \
  --from-literal=tunnelToken=<secrety> -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/cloudflare/cloudflare-tunel-token.yaml
```
- To read it:
```
k get secret cloudflare-cloudflare-tunnel-remote -n cloudflare -o jsonpath="{.data.tunnelToken}" | base64 -d
```

### docker-registry

- [Helm Chart](https://github.com/twuni/docker-registry.helm)
- [Docker image](https://hub.docker.com/_/registry)
- [Docs](https://distribution.github.io/distribution/)
- interact with registry:
  - [API](https://distribution.github.io/distribution/spec/api/)
```shell
curl -X GET https://docker-registry.pengiuns.com/v2/_catalog?n=1000
curl -X GET https://docker-registry.pengiuns.com/v2/jupyter/tags/list

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
https://docker-registry.pengiuns.com/v2/jupyter/manifests/rust

# Second option of the above does not work
curl -sI -H "Accept: application/vnd.oci.image.index.v1+json" https://docker-registry.pengiuns.com/v2/jupyter/manifests/rust

curl -v -X DELETE https://docker-registry.pengiuns.com/v2/jupyter/manifests/sha256:f8705bf78ad6519496337cc2a331d90e4ac84b3de2aef29e9223e9b9a776c127
```
- [Garbage Collection](https://distribution.github.io/distribution/about/garbage-collection/)
  - in container: `registry garbage-collect -m /etc/docker/registry/config.yml --delete-untagged --dry-run`
  - it removes blobs which stay around after removing image or tag
- Useful
  - https://kb.leaseweb.com/kb/kubernetes/kubernetes-deploying-a-docker-registry-on-kubernetes/
  - https://medium.com/geekculture/deploying-docker-registry-on-kubernetes-3319622b8f32
  - https://www.paulsblog.dev/how-to-install-a-private-docker-container-registry-in-kubernetes/
  - Images are stored in `/var/lib/registry/docker/registry/v2`


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

## funnaiest
- Fun LLM app to test cloudflare tunnel
- Also experimenting with auth
```shell
sudo apt install apache2-utils 
htpasswd -c auth myuser
# usr: guest, pswd: give99jokes
# I can also add more users, without the -c

kubectl create secret generic basic-auth \
  --from-file=auth \
  -n funnaiest
# TODO: try sealed secrets and more users
# also oath2, looks promising!
```

### hiker

- Just an experiment, try to add endpoints for Grafana to monitor?

### homepage

- Homepage for all tools [source](https://gethomepage.dev/).
- [List of icons](https://github.com/walkxcode/dashboard-icons)

### Immich
- [Docs](https://immich.app/docs/install/kubernetes/)
- [Helm](https://github.com/immich-app/immich-charts/blob/main/README.md)
- [Chart Repo](https://artifacthub.io/packages/helm/immich/immich)






### ingress-nginx

- Ingress, works like a charm.
- [values.yaml](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)

### it-tools

- Set of interesting IT tools.

### jupyter

- [docs](https://z2jh.jupyter.org/en/stable/jupyterhub/installation.html)
- [images](https://github.com/jupyter/docker-stacks/tree/main/images)
  - more: https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html#jupyter-datascience-notebook
- [repo](https://github.com/jupyterhub/zero-to-jupyterhub-k8s)
- [values](https://github.com/jupyterhub/zero-to-jupyterhub-k8s/blob/HEAD/jupyterhub/values.yaml)
- [refrence](https://z2jh.jupyter.org/en/latest/resources/reference.html)
- [Helm chart](https://github.com/jupyterhub/helm-chart)
- Kernels
  - https://github.com/jupyter/jupyter/wiki/Jupyter-kernels
  - https://github.com/gopherdata/gophernotes
  - https://jupyter-docker-stacks.readthedocs.io/en/latest/index.html

- ports:
  - Hub pod: 8081 (default)
  - Proxy pod: 8000 (user-facing HTTP), 8001 (API, hub ↔ proxy communication)
  - Singleuser pods: 8888 (default Jupyter Notebook/Lab port)

- Testing and debugging on helm chart
```shell
helm upgrade --cleanup-on-fail \
  --install jupyterhub jupyterhub/jupyterhub \
  --namespace jupyterhub \
  --create-namespace \
  --version=4.2.0 \
  --values config.yaml

# remove
helm uninstall jupyterhub --namespace jupyterhub

curl -v -H "Authorization: token <TKN>" http://proxy-api:8001/api/routes

# Secret in PROXY
k exec -it proxy-5958c7cd-6qsjq -n jupyterhub -- printenv CONFIGPROXY_AUTH_TOKEN

# Secret in HUB
k get pod hub-577dd768bb-t5p4h -n jupyterhub -o jsonpath='{.spec.containers[0].env}'

k get secret hub -n jupyterhub -o jsonpath='{.data.hub\.config\.ConfigurableHTTPProxy\.auth_token}' | base64 -d


# DEBUG
kubectl run -it --rm alpine \
  --image=alpine \
  --restart=Never \
  --overrides='{"spec": {"nodeSelector": {"kubernetes.io/hostname": "stuart"}}}' \
  -- sh
```

### User Management - PAMAuthenticator
- Create password for each user - `mkpasswd --method=SHA-512`
- Create file named `passwd`
```bash
honza:x:1000:1000::/home/alice:/bin/bash
bob:x:1001:1001::/home/bob:/bin/bash
```
- Create a file named `shadow`
```bash
alice:$6$hashed...:18599:0:99999:7:::
bob:$6$hashed...:18599:0:99999:7:::
```
- Tar them together `tar czvf users.tar.gz passwd shadow`


## k8up
- Backup of PVs and DBs
- [Repo](https://github.com/k8up-io/k8up)
- [Values](https://github.com/k8up-io/k8up/tree/master/charts/k8up)
- Created Hetzner Bucket

- Secrets
```shell
export PUBLICKEY="sealed-secrets-public.crt"

# Hetzner
k create secret generic hetzner-credentials \
  --namespace k8up \
  --dry-run=client \
  --from-literal=username=RYH6OMTZVDF0D0UR4B4X -o json \
  --from-literal=password=foo -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/k8up/hetzner-credentials.yaml

k create secret generic restic-credentials \
  --namespace k8up \
  --dry-run=client \
  --from-literal=password=foo -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/k8up/restic-credentials.yaml
```

## metabase

- [values](https://github.com/pmint93/helm-charts/tree/master/charts/metabase)
```sql
create database metabase;
create user bot_metabase with password '<pswd>';
alter database metabase owner to bot_metabase;
grant all privileges on database metabase to bot_metabase;
```
- sealed secret
```shell
export PUBLICKEY="sealed-secrets-public.crt"

k create secret generic bot-metabase-pswd \
  --namespace metabase \
  --dry-run=client \
  --from-literal=bot_metabase_user=<pswd> -o json \
  --from-literal=bot_metabase_pswd=<pswd> -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/metabase/bot_metabase_pswd.yaml
```

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

### nextcloud
- [Helm Chart](https://artifacthub.io/packages/helm/nextcloud/nextcloud)
- [values](https://github.com/nextcloud/helm/blob/main/charts/nextcloud/values.yaml)

### ollama

- LLMs!
- [Helm](https://github.com/otwld/ollama-helm)
- [Helm value](https://artifacthub.io/packages/helm/ollama-helm/ollama/0.67.0?modal=values)
- [Github](https://github.com/ollama/ollama?tab=readme-ov-file)

- Interact with the REST API:
- [Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Models](https://ollama.com/library)

```shell
# chat
curl https://ollama.pengiuns.com/api/chat -d '{"model": "llama3.2", "stream": true, "messages": [{ "role": "user", "content": "why is the sky blue?" }]}'

# pull model
curl https://ollama.pengiuns.com/api/pull -d '{"model": "gemma2"}'
curl -L --insecure https://ollama.pengiuns.com/api/pull -d '{"model": "qwen3:1.7b"}'


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

### postgresql

- [chart](https://artifacthub.io/packages/helm/bitnami/postgresql)
- connection:
```shell
brew install libpq
echo 'export PATH="/usr/local/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

psql -h 192.168.178.150 -p 5432 -U postgres -d postgres
psql -h 192.168.178.150 -p 5432 -U bot_jerry -d prod
psql -h 192.168.178.150 -p 5432 -U bot_metabase -d metabase

psql -h postgresql.pengiuns.com -p 5432 -U bot_metabase -d metabase

# or postgresql.pengiuns.com as a host

# inside pod / k8s
psql -h postgresql.postgresql.svc.cluster.local -U postgres -d postgres
```

- sealed secret
```shell
export PUBLICKEY="sealed-secrets-public.crt"

k create secret generic psql-secrets \
  --namespace postgresql \
  --dry-run=client \
  --from-literal=user_postgres=<pswd> \
  --from-literal=user_bot_jerry=<pswd> \
  -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/postgresql/psql_secrets.yaml
```

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

### Trilium
- [Helm](https://github.com/TriliumNext/helm-charts)
- [Docker](https://github.com/TriliumNext/Trilium/blob/main/docs/User%20Guide/User%20Guide/Installation%20&%20Setup/Server%20Installation/1.%20Installing%20the%20server/Using%20Docker.md)
- [App](https://formulae.brew.sh/cask/triliumnext-notes)

## Archive

### joplin
- [GitHub](https://github.com/laurent22/joplin)
- [values](https://artifacthub.io/packages/helm/rubxkube/joplin?modal=values)
- [Helm Chart](https://github.com/RubxKube/charts/tree/main/charts/joplin)
- Set up DB
```sql
CREATE DATABASE joplin;
CREATE USER bot_joplin WITH PASSWORD 'pswd';
GRANT ALL PRIVILEGES ON DATABASE joplin TO bot_joplin;

-- I must connect to the db `joplin` with postgres (admin) user and run this!
GRANT ALL ON SCHEMA public TO bot_joplin;
```

- sealed secret
```shell
export PUBLICKEY="sealed-secrets-public.crt"

k create secret generic bot-joplin-pswd \
  --namespace joplin \
  --dry-run=client \
  --from-literal=password=foo -o json \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /home/github/gru-ops/gitops/manifests/joplin/bot_joplin_pswd.yaml
```

### NFS

- NFS: Based on this [OpenEBS](https://openebs.io/docs/Solutioning/read-write-many/nfspvc)

### Harbor

- Store my containers.
- [Helm](https://artifacthub.io/packages/helm/bitnami/harbor)
- [Helm values](https://github.com/bitnami/charts/blob/main/bitnami/harbor/values.yaml)

### Ray

- [Docs](https://docs.ray.io/en/latest/cluster/kubernetes/getting-started/raycluster-quick-start.html)
- https://github.com/ray-project/kuberay/blob/master/helm-chart/ray-cluster/README.md
- [operator values.yaml](https://github.com/ray-project/kuberay/blob/master/helm-chart/kuberay-operator/values.yaml)
- [cluster  values.yaml](https://github.com/ray-project/kuberay/blob/master/helm-chart/ray-cluster/values.yaml) 
- Options
  - RayCluster: When you want a persistent Ray cluster that can run multiple workloads over time.
  - RayJob: When you just need to run a single job and don’t need a persistent cluster.
  - RayService: When you want to deploy a long-running, scalable service like an AI inference API.


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
- run in docker for cpu
```shell
# https://docs.vllm.ai/en/stable/getting_started/installation/cpu.html
gh repo clone vllm-project/vllm
uv venv --python 3.12 --seed
docker build -f docker/Dockerfile.cpu --tag vllm-cpu-env --target vllm-openai .

# --model=unsloth/Llama-3.2-1B \
# get token from huggingface web
docker run --rm \
             --privileged=true \
             --shm-size=4g \
             --env "HUGGING_FACE_HUB_TOKEN=<>" \
             -p 8000:8000 \
             -e VLLM_CPU_KVCACHE_SPACE=5 \
             -e VLLM_CPU_OMP_THREADS_BIND=2 \
             vllm-cpu-env \
             --model=meta-llama/Llama-3.2-1B-Instruct \
             --dtype=bfloat16
```