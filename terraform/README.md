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

## Talos

- I ended up using custom image with extensions
- [Factory](https://factory.talos.dev/)
- [Extensions](https://github.com/siderolabs/extensions)
- Inspect with 
```shell
t get extensions -n kevin`
t ls /usr/local/lib/containers/iscsid -n kevin
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

# workers
t upgrade -n stuart --image factory.talos.dev/metal-installer/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225:v1.11.6

# k8s update (can be worker or master)
t -n kevin upgrade-k8s --to "1.34.2"
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
