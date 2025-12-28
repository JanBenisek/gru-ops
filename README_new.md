# Gru

My tiny homelab

## Infra

- [Rennovate](https://developer.mend.io/github/JanBenisek)

### Cloudflare

> Expose my services to the internet

- [Helm Chart](https://github.com/cloudflare/helm-charts/tree/main/charts/cloudflare-tunnel)
- [docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- There is `cloudflare-tunnel` (creates actual tunnel) and `cloudflare-tunnel-remote` (connects to existing tunnel)
- Generate tunnelId
```shell
brew install cloudflare/cloudflare/cloudflared
cloudflared login
cloudflared tunnel create gru-ops-tunnel # note ID and creds

# create secrets
kubectl create secret generic cloudflare-tunel-credentials \
  --from-file=credentials.json=/Users/janbenisek/.cloudflared/d65bf19e-11ed-4df3-81c1-b76923b14de4.json \
  --namespace=cloudflare -o yaml \
  | kubeseal --cert "/Users/janbenisek/github/gru-ops/aux/sealed-secrets-public.crt" -o yaml \
  > /Users/janbenisek/github/gru-ops/argocd/manifests/prod/infra/cloudflare/cloudflare-tunel-credentials.yaml
```

### CSI-NFS-driver
> To interact with my Synology NFS

- [Helm Chart](https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts)

### External-DNS

- [Helm](https://artifacthub.io/packages/helm/external-dns/external-dns)
- [Cloudflare](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/cloudflare.md)
- [Github](https://github.com/kubernetes-sigs/external-dns/blob/master/charts/external-dns/README.md)
- Need to have cloudflare secret (sealed).
- Follow the procedure in `sealed secrets`, then

```shell
./aux/seal-secret.sh cloudflare-api-token external-dns apiKey=API_TOKEN prod/infra/external-dns
```
- It needs annotations:

```json
"annotations": {
    "reflector.v1.k8s.emberstack.com/reflection-allowed": "true",
    "reflector.v1.k8s.emberstack.com/reflection-auto-enabled": "true",
    "reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces": "cert-manager"
  }
```

### Let's Encrypt

> Cert manager

- [Docs](https://cert-manager.io/docs/installation/helm/)
- [Helm Chart](https://artifacthub.io/packages/helm/cert-manager/cert-manager)
- Needs cloudflare API token! Should be replicated first.

### Longhorn

- [Talos install](https://phin3has.blog/posts/talos-longhorn/)

### Monitoring

#### Loki

> Collects and stores logs from apps. Stored in PVC, pod per node.

- [Helm chart](https://artifacthub.io/packages/helm/grafana/loki)
- Deployed as Single Binary - all services run in a single pod (as opposed to ingestor/querier being individual)
- Storage
  - `export-0(1)-loki-minio-0` - stores logs using minIO, two just in case
  - `storage-loki-0` - storage for loki (cache, index files, ...)

#### Prometheus

> Collects and stores metrics from apps. Stored in PVC, pod per node.

- Storage
  - `prometheus-kube-prometheus ...` - time series metrics

#### Grafana

> Visualise logs and metrics.

- Storage
  - `kube-prometheus-stack-grafana` - stores users, dashboards etc

### PostreSQL

> Using cloudnative-pg with vchord extension, v18.

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

- Created secrets and don't forget annotations!
```shell
./aux/seal-secret.sh bot-immich-pswd cnpg username=bot_immich prod/infra/cnpg password=PWD
./aux/seal-secret.sh bot-jerry-pswd cnpg username=bot_jerry prod/infra/cnpg password=PWD
./aux/seal-secret.sh bot-metabase-pswd cnpg username=bot_metabase prod/infra/cnpg password=PWD
./aux/seal-secret.sh superuser-pswd cnpg username=postgres prod/infra/cnpg password=PWD
```
- Set up DB
```sql
-- Prod DB with bot_jerry
create database prod;
create user bot_jerry with password 'PWD';
alter database prod owner to bot_jerry;
grant all privileges on database prod to bot_jerry;
```

### Metallb

> Load Balancer

- Load Balancer, pay attention to DHCP range!

### Metrics

> Enable metrics in Talos

- [Docs](https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/deploy-metrics-server)
- Somehow could not apply through Argo, running manually for now
```shell
k apply -f https://raw.githubusercontent.com/alex1989hu/kubelet-serving-cert-approver/main/deploy/standalone-install.yaml
k apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# skip certs validation
k edit deployment metrics-server -n kube-system
# add to containers.args
# - --kubelet-insecure-tls
# - --kubelet-preferred-address-types=InternalIP
```
### Reflector

> Copy secrets/configmaps from one namespce to another

- [Helm Chart](https://artifacthub.io/packages/helm/emberstack/reflector)
- [GitHub](https://github.com/emberstack/kubernetes-reflector)
- Note that it copies secrets and configmaps, not sealed secrets (those get copied as secrets)
- Trigger reflector Job:
```shell
k create job --from=cronjob/reflector reflector-manual-$(date +%s) -n reflector
```

### Sealed-Secrets

> Encrypt/decrypt secrets in git for the cluster


- Create my own keys. Pod needs to be rebooted

```shell
export PRIVATEKEY="sealed-secrets-private.key"
export PUBLICKEY="sealed-secrets-public.crt"
export NAMESPACE="sealed-secrets"
export SECRETNAME="my-sealed-secrets-certs"

-- valid for 4yrs
openssl req -x509 -days 1460 -nodes -newkey rsa:4096 -keyout "$PRIVATEKEY" -out "$PUBLICKEY" -subj "/CN=sealed-secret/O=sealed-secret"

k -n "$NAMESPACE" create secret tls "$SECRETNAME" --cert="$PUBLICKEY" --key="$PRIVATEKEY"
k -n "$NAMESPACE" label secret "$SECRETNAME" sealedsecrets.bitnami.com/sealed-secrets-key=active
```

- readings
  - https://geek-cookbook.funkypenguin.co.nz/kubernetes/sealed-secrets/
  - https://github.com/bitnami-labs/sealed-secrets/blob/main/docs/bring-your-own-certificates.md

### Synology

- [Guide](https://docs.siderolabs.com/kubernetes-guides/csi/synology-csi)
- [Repo](https://github.com/zebernst/synology-csi-talos)
- [Talos how-to](https://github.com/QuadmanSWE/synology-csi-talos)
- I just copied the content, let's see if there is a better way later.

#### Installation
- Create user with admin access
- Create Storage Pool and Volume (recommended 1 big, can apply fine-grained permission, backup and encryption)
- Create sealed secret, !!! MUST BE `client-info.yml` and `client-info-secret` !!!
  - Good to give it wave number afterwards
```shell
export PUBLICKEY="sealed-secrets-public.crt"

k create secret generic client-info-secret \
  --namespace synology-csi \
  --dry-run=client \
  -o yaml \
  --from-file=client-info.yml=/Users/janbenisek/github/gru-ops/aux/synology-client-info.yml \
  | kubeseal --cert "./${PUBLICKEY}" \
  > /Users/janbenisek/github/gru-ops/argocd/manifests/prod/infra/synology/client-info.yml
```
- Build the image, make it public on GitHub
```shell
REGISTRY_NAME=ghcr.io/janbenise
make docker-build
# ghcr.io/janbenisek/synology-csi:v1.2.1
```
- `LUN` = Logical Storage Number, basic block in Synology (many inside volume). This is what k8s is asking to create.
- Prefer RWO only for iSCI LUNs, possible to use RWX for NFS/SMB (shared storage).
- Test connectivity
```
 curl -k "https://192.168.178.96:5001/webapi/auth.cgi?api=SYNO.API.Auth&version=7&method=login&account=bot_k8s&passwd=<PSWD>&session=Core&format=sid"
```

### Traefik

> Ingress controller

- [Helm Chart](https://artifacthub.io/packages/helm/traefik/traefik)
- [API & Dashboard](https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/)
  - **TODO**: Correct access to the Dashboard, now just `ClusterIP` on 9000, port-forward

## Apps

### Hiker

> Fun project

- Port-forward from 8080


### Immich

> Photo management

- Enable OCI registry:
```shell
argocd repo add ghcr.io/immich-app/immich-charts \
  --type helm \
  --name immich-charts \
  --enable-oci
```
- Set up DB:
```sql
-- Immich with bot_immich
create database immich;
create user bot_immich with password 'squeals-dispatch-fussy-seaside';
alter database immich owner to bot_immich;
grant all privileges on database immich to bot_immich;

-- log in with admin user to DB immich and run:
create extension vector;
create extension vchord;
create extension if not exists earthdistance cascade;
```

### IT-Tools

> Various tools

- [Helm Chart](https://artifacthub.io/packages/helm/jeffresc/it-tools)

### Media

- [Containers](https://hotio.dev/containers/base/)
- ! Needs correct permissions in Synology: Shared folder - NSF permission!

#### Bazarr
> Subtitles

- Setup
  3. Add subtitles providers
  3. Add Radarr/Sonarr: `sonarr.media.svc.cluster.local`, port 80.

#### Prowlarr

> Indexer
- Setup
  1. Add new indexer (nzbplanet for example, `https://api.nzbplanet.net`)
  2. Connect Prowlarr to Radarr: Generate API key in Radarr, add url `https://radarr. ...`
  3. Same for Sonarr

#### Radarr

> Movies
- Setup
  3. Radarr needs to send request to Download. Add download client: `sabnzbd.media.svc.cluster.local`, port 80, API key from Sabnzbd.
  3. Create folder in `data/` and adjust permissions `mkdir movies && chown -R 329:hotio movies`

### Sonarr

> Shows

- Setup - same as Radarr

#### sabnzbd

> Usenet access

- [NewsHosting](https://controlpanel.newshosting.com/customer/index.php) - Provider.
  - Like qBitTorrent but not P2P, distributed servers, like archives. AKA provider.
  - Gives access to UseNet, paid
  - Primary Usenet Provider (when setting up Sabnzbd)
    - `news.newshosting.com`
- Sabnzbd - client that downloads, like qBitTorrent. I give it my creds from NewsHosting
- [NZBPlanet](https://nzbplanet.net/profile#api_rss) - Used through indexer, like PirateBay.
  - indexer - bought for 1yr (11/2026) for 12EUR, VIP
  - I got 5000 api calls / day and unlimited downloads
  - I am also keeping the second [NZBFinder](https://nzbfinder.ws/profile)
    - but it has only 5000 limit to api calls and downloads
  - API: `api.nzbplanet.net`

- Setup
  0. Add primary Usenet Provider (when setting up Sabnzbd) `news.newshosting.com`
  0. Change Dowloads folder: `/data/Downloads/complete`, same for incomplete

### Metabase

> Dashboards

- [Helm Chart](https://artifacthub.io/packages/helm/pmint93/metabase)
- Set up DB
```sql
-- Metabase with bot_metabase
create database metabase;
create user bot_metabase with password 'PWD';
alter database metabase owner to bot_metabase;
grant all privileges on database metabase to bot_metabase;
```

### Stirling

> PDF tools

- [GitHub](https://github.com/Stirling-Tools/Stirling-PDF)