import assert from "node:assert/strict";
import { test } from "node:test";
import { handleWorkspaceApi } from "./workspace-cloudflare.mjs";

test("the assessment preview returns bilingual results without writing a lead", async (context) => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://assessment-test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "assessment-test-key";
  context.after(() => {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  });
  const fetch = context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 201 }));

  const response = await handleWorkspaceApi(new Request("https://dutaintegra.my/api/workspace/assessments/preview", {
    method: "POST",
    body: JSON.stringify({
      digitalMaturity: 2,
      priorities: ["automation", "automation", "sales"],
    }),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json();
  assert.equal(result.score, 40);
  assert.equal(result.en.maturityLabel, "Digital Growth");
  assert.equal(result.bm.maturityLabel, "Pertumbuhan Digital");
  assert.equal(result.en.recommendations.length, 3);
  assert.equal(result.bm.recommendations.length, 3);
  assert.equal(fetch.mock.callCount(), 0);
});
