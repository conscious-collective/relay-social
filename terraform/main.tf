terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_pages_project" "relay_social" {
  account_id        = var.cloudflare_account_id
  name              = "relay-social"
  production_branch = "main"

  source {
    type = "github"
    config {
      owner                         = "conscious-collective"
      repo_name                     = "relay-social"
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "custom"
      preview_branch_includes       = ["feat/*", "fix/*", "chore/*"]
    }
  }

  build_config {
    build_command   = "npm ci && npm run build:cloudflare"
    destination_dir = ".vercel/output/static"
    root_dir        = ""
  }

  deployment_configs {
    production {
      environment_variables = {
        DATABASE_URL    = var.database_url
        JWT_SECRET      = var.jwt_secret
        META_APP_ID     = var.meta_app_id
        META_APP_SECRET = var.meta_app_secret
        NODE_VERSION    = "20"
      }
      compatibility_date  = "2024-09-23"
      compatibility_flags = ["nodejs_compat"]
    }

    preview {
      environment_variables = {
        DATABASE_URL = var.database_url
        JWT_SECRET   = var.jwt_secret
        NODE_VERSION = "20"
      }
      compatibility_date  = "2024-09-23"
      compatibility_flags = ["nodejs_compat"]
    }
  }
}
