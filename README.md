# Relay Social API

**Cloudflare-native social media scheduling API**

Built with Hono + D1 (SQLite) + Workers

## Quick Start

```bash
# Install dependencies
npm install

# Create D1 database
wrangler d1 create relay-social

# Copy database ID to wrangler.toml, then:
npm run db:push

# Run locally
npm run dev

# Deploy
npm run deploy
```

## Environment Variables

```bash
JWT_SECRET=your-jwt-secret
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
DODO_PAYMENTS_API_KEY=your-dodo-api-key
DODO_PRO_PRODUCT_ID=your-pro-product-id
NEXT_PUBLIC_APP_URL=https://your-domain.workers.dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/accounts | List accounts |
| POST | /api/accounts/connect/instagram | Connect Instagram |
| GET | /api/posts | List posts |
| POST | /api/posts | Create post |
| POST | /api/posts/:id/publish | Publish instantly |
| GET | /api/webhooks | List webhooks |
| POST | /api/webhooks | Create webhook |
| GET | /api/billing/plans | Get plans |
| POST | /api/billing/checkout | Create checkout |

## Architecture

- **Backend**: Hono (Cloudflare Worker)
- **Database**: D1 (SQLite)
- **Auth**: JWT
- **Payments**: DoDo (ready to integrate)

## License

MIT
