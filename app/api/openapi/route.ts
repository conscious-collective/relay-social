export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/openapi
 * Returns OpenAPI 3.1 spec for Relay Social API
 */
export async function GET(req: NextRequest) {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Relay Social API",
      description: "Agent-native social media scheduling API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local development",
      },
    ],
    paths: {
      "/api/auth/signup": {
        post: {
          summary: "Create account",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Account created" },
            400: { description: "Invalid request" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          summary: "Get current user",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "User data" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/keys": {
        get: {
          summary: "List API keys",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "API keys list" },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          summary: "Create API key",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "API key created" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          summary: "Refresh access token",
          description: "Programmatically refresh an expired or expiring access token for a connected account",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["accountId"],
                  properties: {
                    accountId: {
                      type: "string",
                      description: "ID of the account to refresh",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Token refreshed successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      accountId: { type: "string" },
                      platform: { type: "string" },
                      expiresAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            400: { description: "Invalid request or no refresh token available" },
            401: { description: "Unauthorized" },
            404: { description: "Account not found" },
            500: { description: "Refresh failed" },
          },
        },
      },
      "/api/auth/status": {
        get: {
          summary: "Check account status",
          description: "Check if a connected account's access token is still valid",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "accountId",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "ID of the account to check",
            },
          ],
          responses: {
            200: {
              description: "Account status",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      accountId: { type: "string" },
                      platform: { type: "string" },
                      handle: { type: "string" },
                      status: {
                        type: "string",
                        enum: ["active", "expired", "expiring_soon", "unknown"],
                      },
                      expiresAt: { type: "string", format: "date-time", nullable: true },
                      daysUntilExpiry: { type: "number", nullable: true },
                      needsRefresh: { type: "boolean" },
                      hasRefreshToken: { type: "boolean" },
                    },
                  },
                },
              },
            },
            400: { description: "Missing accountId parameter" },
            401: { description: "Unauthorized" },
            404: { description: "Account not found" },
          },
        },
      },
      "/api/accounts": {
        get: {
          summary: "List connected accounts",
          tags: ["Accounts"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Accounts list" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/accounts/connect/instagram": {
        post: {
          summary: "Connect Instagram account",
          tags: ["Accounts"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["access_token", "instagram_account_id", "name", "handle"],
                  properties: {
                    access_token: { type: "string" },
                    instagram_account_id: { type: "string" },
                    name: { type: "string" },
                    handle: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Account connected" },
            400: { description: "Invalid request" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/posts": {
        get: {
          summary: "List posts",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              schema: { type: "string" },
              description: "Filter by status (draft, scheduled, published, failed)",
            },
            {
              name: "account_id",
              in: "query",
              schema: { type: "string" },
              description: "Filter by account ID",
            },
          ],
          responses: {
            200: { description: "Posts list" },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          summary: "Create post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["account_id", "content"],
                  properties: {
                    account_id: { type: "string" },
                    content: { type: "string" },
                    media_urls: { type: "array", items: { type: "string" } },
                    scheduled_at: { type: "string", format: "date-time" },
                    metadata: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Post created" },
            400: { description: "Invalid request" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/posts/{id}": {
        get: {
          summary: "Get post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Post data" },
            401: { description: "Unauthorized" },
            404: { description: "Post not found" },
          },
        },
        patch: {
          summary: "Update post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                    media_urls: { type: "array", items: { type: "string" } },
                    scheduled_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Post updated" },
            400: { description: "Cannot edit published post" },
            401: { description: "Unauthorized" },
            404: { description: "Post not found" },
          },
        },
        delete: {
          summary: "Delete post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Post deleted" },
            401: { description: "Unauthorized" },
            404: { description: "Post not found" },
          },
        },
      },
      "/api/posts/{id}/publish": {
        post: {
          summary: "Publish post immediately",
          description: "Instantly publish a post without waiting for scheduler",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Post published successfully" },
            400: { description: "Post already published or publishing" },
            401: { description: "Unauthorized" },
            404: { description: "Post not found" },
            500: { description: "Publish failed" },
          },
        },
      },
    },
    "/api/webhooks": {
      get: {
        summary: "List webhooks",
        description: "Get all webhooks configured for your account",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "List of webhooks" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create webhook",
        description: "Register a new webhook endpoint for events",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url", "events", "userId"],
                properties: {
                  url: { type: "string", format: "uri" },
                  events: {
                    type: "array",
                    items: { type: "string", enum: ["post.published", "post.failed", "account.connected", "account.expired"] },
                  },
                  userId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Webhook created" },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/webhooks/{id}": {
      get: {
        summary: "Get webhook",
        description: "Get details of a specific webhook",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Webhook details" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "Update webhook",
        description: "Toggle webhook enabled/disabled",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Webhook updated" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete webhook",
        description: "Remove a webhook endpoint",
        tags: ["Webhooks"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Webhook deleted" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
