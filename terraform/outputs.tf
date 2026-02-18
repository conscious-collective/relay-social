output "pages_url" {
  description = "Cloudflare Pages URL"
  value       = "https://${cloudflare_pages_project.relay_social.name}.pages.dev"
}

output "pages_project_name" {
  description = "Pages project name"
  value       = cloudflare_pages_project.relay_social.name
}
