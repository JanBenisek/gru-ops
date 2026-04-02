terraform {
  required_providers {
    proxmox = {
      source = "Telmate/proxmox"
    }
  }
}

resource "proxmox_vm_qemu" "vm" {
  name        = var.name
  target_node = var.node # name of the VM
  vmid        = var.vmid # id of the VM node

  # agent       = var.agent # Commented due to provider bug
  onboot                 = true # autostarts on boot
  memory                 = var.memory
  full_clone             = false
  define_connection_info = false
  qemu_os                = "l26"

  cpu {
    cores   = var.cores
    sockets = 1
    numa    = false
  }

  scsihw = "virtio-scsi-single" # booting settings
  boot   = var.boot_order

  network {
    id       = 0
    model    = "virtio"   # Network interface
    bridge   = var.bridge # proxmox bridge type
    firewall = true       # Match existing
  }

  disks {
    scsi {
      scsi0 {
        disk {
          size    = var.disk_size
          storage = var.disk_storage
        }
      }
    }
    ide {
      ide2 {
        cdrom {
          iso = var.iso_file
        }
      }
    }
  }
}
