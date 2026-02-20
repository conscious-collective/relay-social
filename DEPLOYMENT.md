# Deployment

## Cloudflare Pages

Relay Social deploys to Cloudflare Pages.

### Automatic Deployments

Push to `main` → CI runs → Auto-deploys to Cloudflare Pages

### Manual Deploy

```bash
npm run build:cloudflare
wrangler pages deploy
```

### Environment Variables

Required in Cloudflare dashboard:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — Random string for JWT signing
- `META_APP_ID` — Meta developer app ID
- `META_APP_SECRET` — Meta developer app secret

### Preview Deployments

Preview deployments run automatically for PRs via GitHub Actions.
