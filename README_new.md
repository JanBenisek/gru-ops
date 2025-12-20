# Gru

My tiny homelab

## Applications

### Metallb

> Load Balancer

- Load Balancer, pay attention to DHCP range!

### Traefik

> Ingress controller

- [Helm Chart](https://artifacthub.io/packages/helm/traefik/traefik)
- [API & Dashboard](https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/)
  - **TODO**: Correct access to the Dashboard, now just `ClusterIP` on 9000, port-forward

## Reflector

> Copy secrets/configmaps from one namespce to another

- [Helm Chart](https://artifacthub.io/packages/helm/emberstack/reflector)
- [GitHub](https://github.com/emberstack/kubernetes-reflector)
- Note that it copies secrets and configmaps, not sealed secrets (those get copied as secrets)

## Sealed-Secrets

> Encrypt/decrypt secrets in git for the cluster

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
