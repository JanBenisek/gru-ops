terraform {
  required_version = "= 1.14.2"

  required_providers {
    proxmox = {
      source  = "Telmate/proxmox"
      version = "3.0.2-rc05"
    }
    talos = {
      source  = "siderolabs/talos"
      version = "0.11.0-beta.1"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.48"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "proxmox" {
  pm_api_url      = var.pm_api_url
  pm_user         = var.pm_user
  pm_password     = var.pm_password
  pm_tls_insecure = true
}

provider "hcloud" {
  token = var.hcloud_token
}

# AWS provider configured for Hetzner Object Storage (S3-compatible)
provider "aws" {
  alias  = "hetzner"
  region = "fsn1"

  endpoints {
    s3 = var.s3_endpoint
  }

  access_key = var.s3_access_key
  secret_key = var.s3_secret_key

  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
}
