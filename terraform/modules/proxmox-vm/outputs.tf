output "vmid" {
  value = proxmox_vm_qemu.vm.vmid
}

output "ip_address_for_talos_bob" {
  value = proxmox_vm_qemu.vm.default_ipv4_address
}
