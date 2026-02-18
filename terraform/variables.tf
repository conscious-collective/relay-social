variable "cloudflare_api_token" {
  description = "Cloudflare API token with Pages and R2 permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "database_url" {
  description = "Neon PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for JWT signing"
  type        = string
  sensitive   = true
}

variable "meta_app_id" {
  description = "Meta/Facebook App ID for Instagram OAuth"
  type        = string
  default     = ""
}

variable "meta_app_secret" {
  description = "Meta/Facebook App Secret for Instagram OAuth"
  type        = string
  sensitive   = true
  default     = ""
}
