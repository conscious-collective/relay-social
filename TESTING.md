# Testing Guide

## Prerequisites

1. **Neon Database** - Set up at https://neon.tech
2. **Meta Developer App** - For Instagram API access
3. **Cloudflare Account** - For deployment (optional)

## Environment Variables

Create `.env.local`:

```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your-random-secret-min-32-chars
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Test Flows

### 1. User Signup → Create API Key

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Response: { "user": {...}, "sessionToken": "..." }
```

Then create an API key:

```bash
curl -X POST http://localhost:3000/api/auth/keys \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}'

# Response: { "id": "key_...", "key": "rsk_...", "name": "Test Key" }
```

### 2. Connect Instagram Account

```bash
curl -X POST http://localhost:3000/api/accounts/connect/instagram \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "your-instagram-access-token",
    "instagramAccountId": "your-instagram-account-id"
  }'

# Response: { "id": "acc_...", "platform": "instagram", "name": "...", "handle": "..." }
```

### 3. Create and Schedule a Post

```bash
# Create post (draft)
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Hello from Relay Social! 🚀",
    "mediaUrls": ["https://example.com/image.jpg"],
    "accountId": "acc_..."
  }'

# Response: { "id": "post_...", "status": "draft", ... }

# Schedule post (for 1 minute from now)
curl -X PUT http://localhost:3000/api/posts/post_xxx \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "scheduled",
    "scheduledAt": "2026-02-20T12:00:00Z"
  }'
```

### 4. Instant Publish

```bash
curl -X POST http://localhost:3000/api/posts/post_xxx/publish \
  -H "Authorization: Bearer <api_key>"

# Response: { "success": true, "postId": "post_..." }
# Post status updates to "publishing" then "published" or "failed"
```

### 5. Check Account Status

```bash
curl http://localhost:3000/api/accounts \
  -H "Authorization: Bearer <api_key>"

# Response: { "accounts": [...] }
```

### 6. Webhooks

```bash
# Create webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["post.published", "post.failed"],
    "userId": "user_xxx"
  }'

# Response: { "id": "wh_...", "secret": "whs_...", ... }
# IMPORTANT: Save the secret - it's only shown once!

# List webhooks
curl "http://localhost:3000/api/webhooks?userId=user_xxx" \
  -H "Authorization: Bearer <api_key>"

# Toggle webhook
curl -X PUT http://localhost:3000/api/webhooks/wh_xxx \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Delete webhook
curl -X DELETE http://localhost:3000/api/webhooks/wh_xxx \
  -H "Authorization: Bearer <api_key>"
```

### 7. Get OpenAPI Spec (for agents)

```bash
curl http://localhost:3000/api/openapi

# Returns full OpenAPI 3.1 spec
```

## Manual Testing Checklist

- [ ] Sign up new user
- [ ] Create API key
- [ ] Connect Instagram account (with valid token)
- [ ] Create draft post
- [ ] Schedule post
- [ ] Instant publish
- [ ] Check post status updates
- [ ] Create/list/delete webhooks
- [ ] Verify webhook HMAC signature

## CI/Cloudflare Issues

If CI fails with Terraform:
- Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub repo secrets
- Get token from: https://dash.cloudflare.com/profile/api-tokens
