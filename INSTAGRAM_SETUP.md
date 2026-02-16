# 📸 Instagram Setup Guide

To publish to Instagram via Relay Social, you need:
1. Instagram Business or Creator account
2. Meta App with Instagram permissions
3. Access token with correct scopes

---

## Step 1: Convert to Business/Creator Account

1. Open Instagram app
2. Go to Settings → Account
3. Switch to Professional Account
4. Choose Business or Creator

---

## Step 2: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as app type
4. Fill in:
   - **App Name**: "Relay Social" (or your choice)
   - **App Contact Email**: Your email
5. Click "Create App"

---

## Step 3: Add Instagram Product

1. In your app dashboard, find **Instagram** in the products list
2. Click "Set Up"
3. Follow the setup wizard

---

## Step 4: Get User Access Token

### Option A: Graph API Explorer (Quick Test)
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click "Generate Access Token"
4. Grant permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_insights`
   - `pages_show_list`
5. Copy the token (valid for ~1 hour)

### Option B: Long-Lived Token (Production)
1. Get short-lived token from Graph API Explorer (above)
2. Exchange for long-lived token (60 days):

```bash
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?\
  grant_type=fb_exchange_token&\
  client_id=YOUR_APP_ID&\
  client_secret=YOUR_APP_SECRET&\
  fb_exchange_token=SHORT_LIVED_TOKEN"
```

3. Response contains `access_token` (valid 60 days)

---

## Step 5: Get Instagram User ID

With your access token, find your Instagram Business Account ID:

```bash
curl -X GET "https://graph.facebook.com/v21.0/me/accounts?\
  fields=instagram_business_account&\
  access_token=YOUR_ACCESS_TOKEN"
```

Look for the `instagram_business_account.id` value. This is your **User ID**.

---

## Step 6: Add Account to Relay Social

```bash
curl -X POST http://localhost:3001/api/accounts \
  -H "Authorization: Bearer relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "platform_id": "YOUR_IG_USER_ID",
    "name": "Your Brand Name",
    "handle": "your.handle",
    "access_token": "YOUR_ACCESS_TOKEN"
  }'
```

---

## Step 7: Test Publishing

### Single Image Post

1. **Host your image publicly** (required by Instagram API)
   - Upload to Imgur, Cloudinary, S3, or any public URL
   - Example: `https://i.imgur.com/example.jpg`

2. **Create and publish a post**:

```bash
curl -X POST http://localhost:3001/api/posts \
  -H "Authorization: Bearer relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "content": "Test post from Relay Social! 🚀 #test",
    "media_urls": ["https://i.imgur.com/example.jpg"],
    "status": "draft"
  }'
```

3. **Publish it now**:

```bash
curl -X POST http://localhost:3001/api/posts/POST_ID/publish \
  -H "Authorization: Bearer relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S"
```

4. **Or schedule it**:

```bash
# Schedule for 1 hour from now
SCHEDULE_TIME=$(node -e "console.log(Date.now() + 3600000)")

curl -X PATCH http://localhost:3001/api/posts/POST_ID \
  -H "Authorization: Bearer relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S" \
  -H "Content-Type: application/json" \
  -d "{\"scheduled_at\": $SCHEDULE_TIME}"
```

The scheduler will publish it automatically when the time comes! ⏰

---

## Rate Limits

Instagram API limits:
- **50 posts per day** per account
- **25 carousels per day** per account

---

## Troubleshooting

### "Invalid OAuth access token"
- Token expired (get a new one)
- Missing required permissions

### "Error validating access token"
- App is in Development mode (limited to test users)
- Token doesn't match the app

### "Media not found"
- Image URL not publicly accessible
- Instagram can't fetch the image (try a different host)

### "Carousel posts require 2-10 items"
- Carousels need at least 2 media items
- Maximum 10 items

---

## Production Notes

For production, implement:
1. **OAuth flow** for users to connect their accounts
2. **Token refresh** logic (exchange expired tokens)
3. **Webhook** to receive Instagram events
4. **Rate limiting** to respect API quotas

---

*Built with 💃 by Billo Rani*
