# Gru

My tiny homelab

## Applications

### Metallb

- Load Balancer, pay attention to DHCP range!

### Traefik

- [Helm Chart](https://artifacthub.io/packages/helm/traefik/traefik)
- [API & Dashboard](https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/)
  - **TODO**: Correct access to the Dashboard, now just `ClusterIP` on 9000, port-forward

## Reflector

- [Helm Chart](https://artifacthub.io/packages/helm/emberstack/reflector)