# Gru

My tiny homelab

## Infra

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


### Media

- [Containers](https://hotio.dev/containers/base/)

#### sabnzbd

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


### Metallb

> Load Balancer

- Load Balancer, pay attention to DHCP range!

### Metrics

> Enable metrics in Talos

- [Docs](https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/deploy-metrics-server)

### Reflector

> Copy secrets/configmaps from one namespce to another

- [Helm Chart](https://artifacthub.io/packages/helm/emberstack/reflector)
- [GitHub](https://github.com/emberstack/kubernetes-reflector)
- Note that it copies secrets and configmaps, not sealed secrets (those get copied as secrets)

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
