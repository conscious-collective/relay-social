// Test LinkedIn integration
import fetch from 'node-fetch';

const API_BASE = "http://localhost:3001";

async function testLinkedIn() {
  try {
    console.log("🔗 Testing LinkedIn integration...\n");

    // Test OAuth providers endpoint
    console.log("1. Checking OAuth providers...");
    const providersResponse = await fetch(`${API_BASE}/api/oauth/providers`);
    const providers = await providersResponse.json();
    
    console.log("✅ Available providers:", Object.keys(providers.providers));
    
    if (providers.providers.linkedin) {
      console.log("✅ LinkedIn OAuth:", providers.providers.linkedin.available ? "✅ Ready" : "❌ Missing config");
      console.log("   Auth URL:", providers.providers.linkedin.authUrl);
      console.log("   Scopes:", providers.providers.linkedin.scopes.join(", "));
    } else {
      console.log("❌ LinkedIn not found in providers");
    }

    // Test API documentation
    console.log("\n2. Checking API docs...");
    const docsResponse = await fetch(`${API_BASE}/api`);
    const docs = await docsResponse.json();
    
    const linkedinEndpoints = Object.keys(docs.endpoints).filter(key => 
      key.includes('linkedin') || docs.endpoints[key].includes('linkedin')
    );
    
    console.log("✅ LinkedIn endpoints:", linkedinEndpoints);
    
    if (docs.oauth?.linkedin) {
      console.log("✅ LinkedIn OAuth config documented");
      console.log("   Required env vars:", docs.oauth.linkedin.required_env.join(", "));
    }

    console.log("\n🎉 LinkedIn integration test complete!");
    console.log(`\n📚 Start LinkedIn OAuth: http://localhost:3001/api/oauth/linkedin`);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testLinkedIn();