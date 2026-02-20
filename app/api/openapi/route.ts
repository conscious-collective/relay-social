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
