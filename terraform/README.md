# Infra

- Install stuff
    - `brew tap hashicorp/tap`
    - `brew install hashicorp/tap/terraform`
    - `terraform -v`
    - `brew install siderolabs/tap/talosctl`

- Good to know
```shell
# remove stale resource
tf state list
tf state rm 'talos_machine_configuration_apply.worker_config_apply[0]'
```

## Hetzner

- Using `Storage Box` that at the time of writing does not have terraform module.
- Therefore, create manually and created k8s secret.

## Talos

- I ended up using custom image with extensions
- [Factory](https://factory.talos.dev/)
- [Extensions](https://github.com/siderolabs/extensions)
  - [More details](https://a-cup-of.coffee/blog/talos-ext/)
- Inspect with
```shell
t get extensions -n kevin
t ls /usr/local/lib/containers/iscsid -n kevin
t -n kevin ls /usr/local
```
- Output
```yaml
# These should be in the image now
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/btrfs
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
```

- Replace talosconfig
```shell
t config merge ./talosconfig
```

- Update (not possible through `tf` now)
```shell
# master
t upgrade -n kevin --image factory.talos.dev/metal-installer/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225:v1.11.6

t upgrade -n kevin --image factory.talos.dev/metal-installer/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225:v1.12.6

# workers
t upgrade -n stuart --image factory.talos.dev/metal-installer/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225:v1.11.6

t upgrade -n stuart --image factory.talos.dev/metal-installer/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225:v1.12.6

# k8s update (can be worker or master)
t -n kevin upgrade-k8s --to "1.35.3"
```

### Generate secrets and configs
- [Secrets](https://docs.siderolabs.com/talos/v1.7/getting-started/prodnotes#separating-out-secrets)
```bash
# Get machine configs
t -n kevin get machineconfig v1alpha1 -o jsonpath='{.spec}' > kevin_controlplane_machineconfig.json
t -n stuart get machineconfig v1alpha1 -o jsonpath='{.spec}' > stuart_worker_machineconfig.json
t -n bob get machineconfig v1alpha1 -o jsonpath='{.spec}' > bob_worker_machineconfig.json

# Get secrets
t gen secrets --from-controlplane-config kevin_controlplane_machineconfig.json -o secrets.yaml
t gen config kevin "https://192.168.178.39:6443" --with-secrets secrets.yaml --output-types talosconfig
t -n kevin kubeconfig .

# Import secrets in tf
tf import talos_machine_secrets.machine_secrets /Users/janbenisek/github/gru-ops/talos/machineconfigs/secrets.yaml
```

### Renew expired certs

- Check validity:
```shell
# in ~/.talos
t config info

# in ~/.kube
k config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' \
| base64 -d \
| openssl x509 -text -noout
```

- Renew:
  - [GitHub Issue](https://github.com/siderolabs/talos/discussions/9457)
```shell
# Extracts certs
yq -r .machine.ca.crt controlplane.yaml | base64 -d > ca.crt
yq -r .machine.ca.key controlplane.yaml | base64 -d > ca.key

# Generate fresh credentials
talosctl gen key --name admin
talosctl gen csr --key admin.key --ip 192.168.178.39
talosctl gen crt --ca ca --csr admin.csr --name admin --hours 8760

# Replace it in talosconfig
yq eval '
  .contexts.gru.ca = "'"$(base64 -b0 -i ca.crt)"'" |
  .contexts.gru.crt = "'"$(base64 -b0 -i admin.crt)"'" |
  .contexts.gru.key = "'"$(base64 -b0 -i admin.key)"'"
' -i ~/.talos/config

# regenerate .kube
t kubeconfig ~/.kube/config -n kevin --force
```

## Proxmox

- Provision Talos VM (manual for now)
- [Docs](https://docs.siderolabs.com/talos/v1.10/platform-specific-installations/virtualized-platforms/proxmox)
```bash
# Get ISO
 curl https://factory.talos.dev/image/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225/v1.12.6/metal-amd64.iso -L -o metal-amd64.iso

# Check which disk is used for correct installation (patch file)
t -n 192.168.178.103 get disks --insecure
```
