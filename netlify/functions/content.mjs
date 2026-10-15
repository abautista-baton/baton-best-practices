// Netlify Function (v2). Handles:
//   GET  /api/content                    -> public, returns the saved page content
//   GET  /api/content?version=previous   -> password required, returns the version before the latest save
//   PUT  /api/content                    -> password required, saves new content
//   POST /api/login                      -> checks the password (used by the /edit login screen)
//
// The password lives ONLY in the EDIT_PASSWORD environment variable on Netlify.
// It is never stored in the page or in the repository.

import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const MAX_BYTES = 300_000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const sha = (s) => createHash("sha256").update(String(s ?? "")).digest();

export function passwordOk(given, expected) {
  if (!expected) return false;
  return timingSafeEqual(sha(given), sha(expected));
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

export function validateContent(c) {
  if (!isObj(c)) return "Content must be an object.";
  if (!isObj(c.hero)) return "Missing hero.";
  if (!isObj(c.footer)) return "Missing footer.";
  if (!Array.isArray(c.sections) || c.sections.length > 60) return "Invalid sections.";
  for (const s of c.sections) {
    if (!isObj(s) || typeof s.type !== "string" || typeof s.id !== "string" || !isObj(s.data)) {
      return "Invalid section.";
    }
  }
  return null;
}

export function createHandler({
  getStoreFn,
  getPassword,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  return async (req) => {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");
    const password = getPassword();

    const needPassword = () =>
      json({ error: "EDIT_PASSWORD is not set in the Netlify environment variables." }, 500);

    // ---- Login check ----
    if (path === "/api/login" && req.method === "POST") {
      if (!password) return needPassword();
      let body = {};
      try { body = await req.json(); } catch { /* ignore */ }
      if (passwordOk(body.password, password)) return json({ ok: true });
      await sleep(800); // slow down guessing
      return json({ error: "Incorrect password." }, 401);
    }

    if (path === "/api/content") {
      const store = getStoreFn();
      const authed = () => passwordOk(req.headers.get("x-edit-password"), password);

      if (req.method === "GET") {
        if (url.searchParams.get("version") === "previous") {
          if (!password) return needPassword();
          if (!authed()) { await sleep(800); return json({ error: "Unauthorized." }, 401); }
          const prev = await store.get("previous", { type: "json" });
          return json(prev ?? { content: null, updatedAt: null });
        }
        const current = await store.get("current", { type: "json" });
        return json(current ?? { content: null, updatedAt: null });
      }

      if (req.method === "PUT") {
        if (!password) return needPassword();
        if (!authed()) { await sleep(800); return json({ error: "Unauthorized." }, 401); }

        const raw = await req.text();
        if (raw.length > MAX_BYTES) return json({ error: "Content is too large." }, 413);
        let body;
        try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON." }, 400); }
        const problem = validateContent(body.content);
        if (problem) return json({ error: problem }, 400);

        const current = await store.get("current", { type: "json" });
        if (current && !body.force && body.baseUpdatedAt !== current.updatedAt) {
          return json({ error: "conflict", updatedAt: current.updatedAt }, 409);
        }
        if (current) await store.setJSON("previous", current);
        const record = { content: body.content, updatedAt: new Date().toISOString() };
        await store.setJSON("current", record);
        return json({ ok: true, updatedAt: record.updatedAt });
      }
    }

    return json({ error: "Not found." }, 404);
  };
}

export default createHandler({
  getStoreFn: () => getStore("site-content"),
  getPassword: () => process.env.EDIT_PASSWORD || "",
});

export const config = { path: ["/api/content", "/api/login"] };
