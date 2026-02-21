# Relay Social 📡

Agent-native social media scheduling API. Built for AI agents, intuitive enough for humans.

## Stack

- **Backend:** Hono (Cloudflare Workers)
- **Database:** D1 (SQLite)
- **Scheduling:** Cloudflare Cron (every minute)
- **Auth:** JWT
- **Payments:** DoDo (ready to integrate)

## Quick Start

```bash
# Install dependencies
npm install

# Create D1 database
wrangler d1 create relay-social
# Copy the database_id to wrangler.toml

# Push schema to D1
wrangler d1 execute relay-social --local --command="$(cat src/schema.sql)"

# Run locally
npm run dev

# Deploy
npm run deploy
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `META_APP_ID` | Yes | Meta/Facebook App ID |
| `META_APP_SECRET` | Yes | Meta/Facebook App Secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Your worker URL |
| `DODO_PAYMENTS_API_KEY` | No | DoDo API key for payments |
| `DODO_PRO_PRODUCT_ID` | No | DoDo product ID for Pro plan |

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Accounts
- `GET /api/accounts` - List connected accounts
- `POST /api/accounts/connect/instagram` - Connect Instagram

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `POST /api/posts/:id/publish` - Publish instantly

### Webhooks
- `GET /api/webhooks` - List webhooks
- `POST /api/webhooks` - Create webhook
- `DELETE /api/webhooks/:id` - Delete webhook

### Billing
- `GET /api/billing/plans` - Get plans
- `POST /api/billing/checkout` - Create checkout

### Other
- `GET /api/health` - Health check
- `GET /api/openapi` - OpenAPI spec
- `POST /api/cron/scheduler` - Internal (called by Cron)

## Scheduling

Posts are scheduled using Cloudflare Cron triggers:

```toml
# wrangler.toml
[triggers]
crons = ["* * * * *"]
```

Every minute, the scheduler checks for due posts and publishes them.

## Plans

| Plan | Price | Limits |
|------|-------|--------|
| Free | $0 | 1 account, 10 posts/week |
| Pro | $5/mo | Unlimited, 1000 credits |

## License

MIT
