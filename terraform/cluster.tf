######################
# SECRETS
######################
# t gen secrets --output-file secrets.yaml --force
resource "talos_machine_secrets" "machine_secrets" {
  talos_version = var.talos_version
}

data "talos_client_configuration" "talosconfig" {
  cluster_name         = var.cluster_name
  client_configuration = talos_machine_secrets.machine_secrets.client_configuration
  endpoints            = [var.control_plane_node_ip]
}

######################
# CONTROLPLANE
######################
data "talos_machine_configuration" "machineconfig_cp" {
  cluster_name       = var.cluster_name
  cluster_endpoint   = var.cluster_endpoint
  machine_type       = "controlplane"
  machine_secrets    = talos_machine_secrets.machine_secrets.machine_secrets
  kubernetes_version = var.k8s_version

  config_patches = [
    templatefile("${path.module}/patches/controlplane.yaml", {
      talos_installer_image = var.talos_image
      kubelet_image         = "ghcr.io/siderolabs/kubelet:${var.k8s_version}"
      cluster_name          = var.cluster_name
    }),
    templatefile("${path.module}/patches/hostname.yaml", {
      hostname = "kevin"
    })
  ]
}

resource "talos_machine_configuration_apply" "cp_config_apply" {
  client_configuration        = talos_machine_secrets.machine_secrets.client_configuration
  machine_configuration_input = data.talos_machine_configuration.machineconfig_cp.machine_configuration
  count                       = 1
  node                        = var.control_plane_node_ip
}

######################
# WORKER - stuart
######################
data "talos_machine_configuration" "machineconfig_stuart" {
  cluster_name       = var.cluster_name
  cluster_endpoint   = var.cluster_endpoint
  machine_type       = "worker"
  machine_secrets    = talos_machine_secrets.machine_secrets.machine_secrets
  kubernetes_version = var.k8s_version

  config_patches = [
    templatefile("${path.module}/patches/worker_stuart.yaml", {
      talos_installer_image = var.talos_image
      kubelet_image         = "ghcr.io/siderolabs/kubelet:${var.k8s_version}"
    }),
    templatefile("${path.module}/patches/hostname.yaml", {
      hostname = "stuart"
    })
  ]
}

resource "talos_machine_configuration_apply" "stuart_config_apply" {
  client_configuration        = talos_machine_secrets.machine_secrets.client_configuration
  machine_configuration_input = data.talos_machine_configuration.machineconfig_stuart.machine_configuration
  count                       = 1
  node                        = var.worker_stuart_node_ip

}


######################
# WORKER - Bob (proxmox)
######################
# TBD later
# module "worker_bob" {
#   source = "../modules/proxmox-vm"

#   name         = "talos-bob"
#   vmid         = 104  # Match existing VMID
#   node         = var.node

#   cores        = 2    # Match existing
#   memory       = 8192 # Match existing
#   disk_size    = "20G" # Match existing
#   disk_storage = "local-lvm"
#   cpu_type     = "x86-64-v2-AES" # Match existing
#   agent        = 0    # Match existing (disabled)

#   bridge       = "vmbr0"

#   # Talos ISO for automated installation
#   iso_file     = "local:iso/talos-1.10.4-metal-amd64.iso"

#   boot_order   = "order=ide2;scsi0;net0" # Boot from ISO first
# }

# For now provisioned manually
data "talos_machine_configuration" "machineconfig_bob" {
  cluster_name       = var.cluster_name
  cluster_endpoint   = var.cluster_endpoint
  machine_type       = "worker"
  machine_secrets    = talos_machine_secrets.machine_secrets.machine_secrets
  kubernetes_version = var.k8s_version

  config_patches = [
    templatefile("${path.module}/patches/worker_bob.yaml", {
      talos_installer_image = var.talos_image
      kubelet_image         = "ghcr.io/siderolabs/kubelet:${var.k8s_version}"
    }),
    templatefile("${path.module}/patches/hostname.yaml", {
      hostname = "bob"
    })
  ]
}

resource "talos_machine_configuration_apply" "bob_config_apply" {
  client_configuration        = talos_machine_secrets.machine_secrets.client_configuration
  machine_configuration_input = data.talos_machine_configuration.machineconfig_bob.machine_configuration
  count                       = 1
  node                        = var.worker_bob_node_ip

}

######################
# BOOTSTRAP
######################
resource "talos_machine_bootstrap" "bootstrap" {
  depends_on           = [talos_machine_configuration_apply.cp_config_apply]
  client_configuration = talos_machine_secrets.machine_secrets.client_configuration
  node                 = var.control_plane_node_ip
}

# Sometimes better to comment out
data "talos_cluster_health" "health" {
  depends_on = [
    talos_machine_configuration_apply.cp_config_apply,
    talos_machine_configuration_apply.stuart_config_apply # Adding worker Stuart
  ]
  client_configuration = data.talos_client_configuration.talosconfig.client_configuration
  control_plane_nodes  = [var.control_plane_node_ip]
  worker_nodes         = [var.worker_stuart_node_ip, var.worker_bob_node_ip] # Adding worker Stuart
  endpoints            = data.talos_client_configuration.talosconfig.endpoints
}


resource "talos_cluster_kubeconfig" "kubeconfig" {
  depends_on = [
    talos_machine_bootstrap.bootstrap,
    data.talos_cluster_health.health
  ]
  client_configuration = talos_machine_secrets.machine_secrets.client_configuration
  node                 = var.control_plane_node_ip
}

########################
# OUTPUTS
########################
resource "local_file" "talosconfig" {
  filename        = "${path.module}/talosconfig"
  content         = data.talos_client_configuration.talosconfig.talos_config
  file_permission = "0600"
}

resource "local_file" "kubeconfig" {
  filename        = "${path.module}/kubeconfig"
  content         = talos_cluster_kubeconfig.kubeconfig.kubeconfig_raw
  file_permission = "0600"
}
