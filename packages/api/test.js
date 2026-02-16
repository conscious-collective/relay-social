// Quick test script for Relay Social API

const API_BASE = "http://localhost:3001";

async function test() {
  try {
    console.log("🧪 Testing Relay Social API...\n");

    // Test health check
    console.log("1. Health check...");
    const health = await fetch(`${API_BASE}/`);
    const healthData = await health.json();
    console.log("✅", healthData.name, healthData.version, healthData.status);

    // Test API docs
    console.log("\n2. API documentation...");
    const docs = await fetch(`${API_BASE}/api`);
    const docsData = await docs.json();
    console.log("✅ Available endpoints:", Object.keys(docsData.endpoints).length);

    // Test OAuth providers
    console.log("\n3. OAuth providers...");
    const oauth = await fetch(`${API_BASE}/api/oauth/providers`);
    const oauthData = await oauth.json();
    console.log("✅ OAuth providers:");
    Object.entries(oauthData.providers).forEach(([platform, config]) => {
      console.log(`   ${platform}: ${config.available ? '✅ configured' : '❌ missing config'}`);
    });

    console.log("\n🎉 API is running successfully!");
    console.log(`\n📚 Open http://localhost:3001/api for full API documentation`);
    console.log(`🔐 OAuth setup: http://localhost:3001/api/oauth/providers`);

  } catch (error) {
    console.error("❌ API test failed:", error.message);
    console.log("\n🔧 Make sure the API server is running:");
    console.log("   cd packages/api && npm run dev");
  }
}

test();