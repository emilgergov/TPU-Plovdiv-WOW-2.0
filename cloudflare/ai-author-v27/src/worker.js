// TPU Plovdiv AI Author V27 — safe bootstrap; AI generation is not publicly enabled.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json({ service: "TPU Plovdiv AI Author V27", status: "online", apiKeyConfigured: Boolean(env.OPENAI_API_KEY), aiGenerationEnabled: false });
    }
    if (request.method === "POST" && url.pathname === "/author") {
      return json({ error: "AI generation is not enabled until authenticated access and privacy controls are configured." }, 503);
    }
    return json({ error: "Not found" }, 404);
  }
};
