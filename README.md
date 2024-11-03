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

## Apps

### Stirling

- set up some configs and use FAT version
- https://github.com/Stirling-Tools/Stirling-PDF/blob/main/Version-groups.md
- https://github.com/Stirling-Tools/Stirling-PDF?tab=readme-ov-file

### Grafana

- https://artifacthub.io/packages/helm/grafana/grafana
- https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- https://fluxcd.io/flux/monitoring/metrics/

### secret-replicator

- [] replace by something more modern with better features, like removing/replacing old secrets