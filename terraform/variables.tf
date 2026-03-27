variable "cluster_name" {
  description = "Talos cluster name"
  type        = string
  default     = "gru"
}

variable "cluster_endpoint" {
  description = "Kubernetes API endpoint"
  type        = string
  default     = "https://192.168.178.39:6443"
}

variable "control_plane_node_ip" {
  description = "Control plane node IP"
  type        = string
  default     = "192.168.178.39"
}

variable "worker_stuart_node_ip" {
  description = "Worker node (Stuart) IP"
  type        = string
  default     = "192.168.178.38"
}

variable "talos_version" {
  description = "Talos version to use for secrets and configuration"
  type        = string
  default     = "v1.12.6"
}

variable "talos_image" {
  description = "Talos version to use for secrets and configuration"
  type        = string
  default     = "factory.talos.dev/metal-installer/5a0d85f0683f3cfe1eddb883e8b9943e651c4a1e644570001dc315ecb3310225:v1.12.6"
}

variable "k8s_version" {
  description = "k8s version to use for kubelet"
  type        = string
  default     = "v1.35.3"
}


variable "pm_api_url" {
  description = "Proxmox API URL"
  type        = string
  default     = "https://192.168.178.40:8006/api2/json"
}

variable "pm_user" {
  description = "Proxmox user"
  type        = string
  default     = "root@pam"
}

variable "pm_password" {
  description = "Proxmox password"
  type        = string
}

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}