variable "name" {}
variable "vmid" {}
variable "node" {
  description = "Proxmox node name"
  type        = string
  default     = "bob-proxmox"
}
variable "cores" {}
variable "memory" {}
variable "disk_size" {}
variable "disk_storage" {}

variable "bridge" {
  description = "Network bridge mode"
  type        = string
  default     = "vmbr0"
}

variable "agent" {
  default = 1
}
variable "boot_order" {
  default = "order=scsi0;ide2"
}
variable "cpu_type" {
  description = "CPU type"
  type        = string
  default     = "host"
}
variable "iso_storage" {
  description = "Storage for ISO files"
  type        = string
  default     = "local"
}
variable "iso_file" {
  description = "ISO file to attach"
  type        = string
  default     = null
}
variable "static_ip" {
  description = "Static IP address to assign"
  type        = string
  default     = null
}
variable "gateway" {
  description = "Gateway IP address"
  type        = string
  default     = "192.168.178.1"
}
variable "nameserver" {
  description = "DNS nameserver"
  type        = string
  default     = "192.168.178.1"
}
