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
- Replace talosconfig
```shell
t config merge ./talosconfig
```

- Update (not possible through `tf` now)
```shell
# master
t upgrade -n kevin --image ghcr.io/siderolabs/installer:v1.10.1 --debug

# workers
t upgrade -n stuart --image ghcr.io/siderolabs/installer:v1.10.4

# k8s update (can be worker or master)
t -n kevin upgrade-k8s --to "1.34.2"
```
