# Gru

My tiny homelab

## TO-DOs

- [] the library for secret replication has been archived, find a replacement
- [] better way to manage secrets, use sops / sealed whatever
- [] traefik instead of nginx
- [] hiker is not removed when removed from here and reconcilled

## DNS rebinding attack

- https://www.reddit.com/r/homelab/comments/qty1an/public_dns_record_pointing_to_private_ip_address/
- https://www.reddit.com/r/homelab/comments/17h16g7/cloudflare_dns_pointed_to_internal_ip_address_safe/

## Sealed secrets

- create public key

```shell
kubeseal --fetch-cert \
--controller-name=sealed-secrets \
--controller-namespace=sealed-secrets \
> pub-cert.pem
```

- example to create a secret `mysecret` in current (or default) namespace

```shell
echo -n batman | kubectl create secret \
generic mysecret --dry-run=client --from-file=foo=/dev/stdin -o json \
| kubeseal --cert pub-cert.pem \
| kubectl create -f -
```

- this will be seen in the logs `k logs  sealed-secrets-6bc55546dd-b6hlh -n sealed-secrets`
- the secret `k get secret mysecret -o yaml -n monitoring`

## Apps

### Stirling

- set up some configs and use FAT version
- https://github.com/Stirling-Tools/Stirling-PDF/blob/main/Version-groups.md
- https://github.com/Stirling-Tools/Stirling-PDF?tab=readme-ov-file

### Monitoring

- Note that it takes a while for all the resources to start! Some might need delete.
- https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack
- https://artifacthub.io/packages/helm/grafana/loki-stack 
- https://github.com/digitalocean/Kubernetes-Starter-Kit-Developers/blob/main/04-setup-observability/loki-stack.md
- https://github.com/digitalocean/Kubernetes-Starter-Kit-Developers/blob/main/04-setup-observability/prometheus-stack.md


- https://artifacthub.io/packages/helm/grafana/grafana
- https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- https://fluxcd.io/flux/monitoring/metrics/

### secret-replicator

- [] replace by something more modern with better features, like removing/replacing old secrets