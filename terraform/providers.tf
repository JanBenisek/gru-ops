terraform {
    required_version = "= 1.14.2"
    
    required_providers {
        proxmox = {
            source  = "Telmate/proxmox"
            version = "3.0.2-rc05"
        }
        talos = {
            source  = "siderolabs/talos"
            version = "~> 0.9.0"
        }
    }
}

provider "proxmox" {
  pm_api_url      = var.pm_api_url
  pm_user         = var.pm_user
  pm_password     = var.pm_password
  pm_tls_insecure = true
}

