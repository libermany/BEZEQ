/**
 * Bezeq lead form - proxy (Cloudflare Worker).
 *
 * The form page (index.html) is a static page on GitHub Pages. It cannot hold the Genesys OAuth
 * client secret, so it posts the lead to this Worker, which keeps the secret and runs the Data Action
 *   POST /api/v2/integrations/actions/{ACTION_ID}/execute      (Bezeq_DA_CreateDirectRequest)
 * that creates the Workitem.
 *
 * Settings (Worker > Settings > Variables and Secrets):
 *   GC_CLIENT_ID      OAuth client id            (secret)
 *   GC_CLIENT_SECRET  OAuth client secret        (secret)
 *   GC_ENV            Genesys region domain, e.g. euw2.pure.cloud
 *   ACTION_ID         id of the Data Action, e.g. custom_-_<your-action-id>
 *   ALLOWED_ORIGIN    origin of the page, e.g. https://libermany.github.io   (no path, no trailing slash)
 *
 * The OAuth client should have a role with ONLY "integrations:action:execute" (Create-BezeqWebFormRole.ps1).
 */

const SPEEDS = ["100", "200", "500", "1000", "2500"];
let cachedToken = null;   // { value, expires }

function cors(env, extra = {}) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    ...extra,
  };
}

function json(env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(env, { "Content-Type": "application/json; charset=utf-8" }),
  });
}

function clean(value, max) {
  return String(value ?? "")
    .replace(/["\\\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function getToken(env) {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  const basic = btoa(`${env.GC_CLIENT_ID}:${env.GC_CLIENT_SECRET}`);
  const r = await fetch(`https://login.${env.GC_ENV}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`token HTTP ${r.status}`);
  const j = await r.json();
  cachedToken = { value: j.access_token, expires: Date.now() + (j.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

async function runAction(env, data) {
  const call = async (token) => fetch(`https://api.${env.GC_ENV}/api/v2/integrations/actions/${env.ACTION_ID}/execute`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  let r = await call(await getToken(env));
  if (r.status === 401) { cachedToken = null; r = await call(await getToken(env)); }
  return r;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== "POST" || url.pathname !== "/api/lead") return json(env, 404, { error: "not found" });

    // only the form page may call this proxy
    const origin = request.headers.get("Origin");
    if (origin !== env.ALLOWED_ORIGIN) return json(env, 403, { error: "forbidden" });

    let input;
    try { input = await request.json(); } catch { return json(env, 400, { error: "bad json" }); }

    // simple spam trap: a hidden field that humans leave empty
    if (input.website) return json(env, 200, { workitemId: "ignored" });

    const data = {
      firstName: clean(input.firstName, 50),
      lastName: clean(input.lastName, 50),
      phoneNumber: clean(input.phoneNumber, 20),
      address: clean(input.address, 100),
      requestedSpeed: clean(input.requestedSpeed, 10),
    };
    if (!data.firstName || !data.lastName || !data.address ||
        !/^\+\d{9,15}$/.test(data.phoneNumber) || !SPEEDS.includes(data.requestedSpeed)) {
      return json(env, 400, { error: "invalid data" });
    }

    try {
      const r = await runAction(env, data);
      const text = await r.text();
      if (!r.ok) return json(env, 502, { error: `data action HTTP ${r.status}` });
      const out = JSON.parse(text);
      return json(env, 200, { workitemId: out.workitemId, name: out.name });
    } catch (e) {
      return json(env, 502, { error: "upstream error" });
    }
  },
};
