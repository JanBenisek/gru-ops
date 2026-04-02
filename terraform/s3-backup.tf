######################
# HETZNER OBJECT STORAGE (S3) FOR BACKUPS
######################

variable "s3_bucket_name" {
  description = "S3 bucket name for k8up backups"
  type        = string
  default     = "gru-k8up-backups"
}

variable "s3_endpoint" {
  description = "S3 endpoint URL"
  type        = string
  default     = "https://fsn1.your-objectstorage.com"
}

variable "s3_region" {
  description = "S3 region"
  type        = string
  default     = "fsn1"
}

variable "restic_password" {
  description = "Restic repository encryption password"
  type        = string
  sensitive   = true
}

######################
# HETZNER S3 CREDENTIALS
######################
# Note: The hcloud provider does not support creating Object Storage credentials.
# created manually

variable "s3_access_key" {
  description = "S3 access key for Hetzner Object Storage (create manually in Hetzner Cloud Console)"
  type        = string
  sensitive   = true
}

variable "s3_secret_key" {
  description = "S3 secret key for Hetzner Object Storage (create manually in Hetzner Cloud Console)"
  type        = string
  sensitive   = true
}

######################
# S3 BUCKET RESOURCE
######################
resource "aws_s3_bucket" "k8up_backups" {
  provider = aws.hetzner
  bucket   = var.s3_bucket_name
}

resource "aws_s3_bucket_versioning" "k8up_backups" {
  provider = aws.hetzner
  bucket   = aws_s3_bucket.k8up_backups.id

  versioning_configuration {
    status = "Disabled"
  }
}

######################
# OUTPUTS
######################
output "s3_bucket_id" {
  description = "S3 bucket ID"
  value       = aws_s3_bucket.k8up_backups.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for backups"
  value       = aws_s3_bucket.k8up_backups.bucket
}

output "s3_endpoint" {
  description = "S3 endpoint URL"
  value       = var.s3_endpoint
}

output "s3_region" {
  description = "S3 region"
  value       = var.s3_region
}

output "s3_access_key" {
  description = "S3 access key"
  value       = var.s3_access_key
  sensitive   = true
}

output "s3_secret_key" {
  description = "S3 secret key"
  value       = var.s3_secret_key
  sensitive   = true
}

output "restic_password" {
  description = "Restic encryption password"
  value       = var.restic_password
  sensitive   = true
}
