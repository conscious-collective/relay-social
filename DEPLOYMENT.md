# Deployment Guide

## Preview Deployments

Preview deployments are **manually triggered** via PR comments to ensure tests pass first.

### How to Deploy a Preview

1. **Push your branch** and open a PR
2. **Wait for CI to pass** (tests must be green ✅)
3. **Comment `/deploy`** on the PR
4. GitHub Actions will:
   - ✅ Verify all tests passed
   - 🚀 Deploy to Vercel
   - 💬 Comment with preview URL

### Setup (First Time)

Add these secrets to your GitHub repo (`Settings > Secrets > Actions`):

```bash
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
```

**Get these values:**

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
cd packages/dashboard
vercel link

# Get credentials
vercel project ls  # Shows project ID
cat .vercel/project.json  # Shows org ID and project ID

# Create token at: https://vercel.com/account/tokens
```

### Automatic Deployments

Only `main` branch auto-deploys to production. All other branches require manual `/deploy` comment after tests pass.

### Disable Auto-Deploy

The `vercel.json` configuration disables automatic deployments for branches:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  },
  "github": {
    "enabled": false
  }
}
```

### Troubleshooting

**"Tests must pass before deployment"**
- Wait for CI workflow to complete
- All test jobs must be green
- Check `.github/workflows/ci.yml` status

**"No CI runs found"**
- Push a commit to trigger CI
- Ensure CI workflow is enabled

**Vercel deployment fails**
- Verify secrets are set correctly
- Check Vercel token hasn't expired
- Ensure project is linked in Vercel dashboard
