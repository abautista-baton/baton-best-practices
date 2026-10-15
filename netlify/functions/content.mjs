// Netlify Function (v2). Handles:
//   GET  /api/content                    -> public, returns the saved page content
//   GET  /api/content?version=previous   -> password required, returns the version before the latest save
//   PUT  /api/content                    -> password required, saves new content
//   POST /api/login                      -> checks the password (used by the /edit login screen)
//   POST /api/upload                     -> password required, stores an image, returns its /api/img/<id> URL
//   GET  /api/img/<id>                   -> public, serves an uploaded image
//
// The password lives ONLY in the EDIT_PASSWORD environment variable on Netlify.
// It is never stored in the page or in the repository.

import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const MAX_BYTES = 300_000;
const MAX_IMAGE_BYTES = 4_500_000; // Netlify Functions accept request bodies up to ~6 MB
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

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

// Check that the bytes really are the image type the browser claims.
export function sniffImage(buf, type) {
  const b = new Uint8Array(buf);
  const at = (i, ...v) => v.every((x, k) => b[i + k] === x);
  switch (type) {
    case "image/png": return at(0, 0x89, 0x50, 0x4e, 0x47);
    case "image/jpeg": return at(0, 0xff, 0xd8, 0xff);
    case "image/gif": return at(0, 0x47, 0x49, 0x46, 0x38);
    case "image/webp": return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
    case "image/svg+xml": {
      const text = new TextDecoder().decode(b).replace(/^\uFEFF/, "").trimStart();
      if (!/^(<\?xml|<svg|<!--|<!doctype svg)/i.test(text)) return false;
      return !/<script|javascript:|\son[a-z]+\s*=/i.test(text); // no active content
    }
    default: return false;
  }
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
  getImageStoreFn,
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

    // ---- Public image delivery ----
    if (path.startsWith("/api/img/") && req.method === "GET") {
      const id = path.slice("/api/img/".length);
      if (!/^[a-f0-9]{20}$/.test(id)) return json({ error: "Not found." }, 404);
      const found = await getImageStoreFn().getWithMetadata(`img/${id}`, { type: "arrayBuffer" });
      if (!found) return json({ error: "Not found." }, 404);
      const type = IMAGE_TYPES.includes(found.metadata?.contentType) ? found.metadata.contentType : "application/octet-stream";
      return new Response(found.data, {
        status: 200,
        headers: {
          "content-type": type,
          "cache-control": "public, max-age=31536000, immutable",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
      });
    }

    // ---- Image upload (password required) ----
    if (path === "/api/upload" && req.method === "POST") {
      if (!password) return needPassword();
      if (!passwordOk(req.headers.get("x-edit-password"), password)) { await sleep(800); return json({ error: "Unauthorized." }, 401); }
      const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!IMAGE_TYPES.includes(type)) return json({ error: "Please upload a PNG, JPG, WebP, GIF or SVG image." }, 415);
      const buf = await req.arrayBuffer();
      if (buf.byteLength === 0) return json({ error: "Empty file." }, 400);
      if (buf.byteLength > MAX_IMAGE_BYTES) return json({ error: "Image is too large (limit about 4 MB)." }, 413);
      if (!sniffImage(buf, type)) return json({ error: "That file doesn't look like a valid " + type.split("/")[1].toUpperCase() + " image." }, 400);
      const id = randomBytes(10).toString("hex");
      await getImageStoreFn().set(`img/${id}`, buf, { metadata: { contentType: type } });
      return json({ ok: true, url: `/api/img/${id}` });
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
  getImageStoreFn: () => getStore("site-images"),
  getPassword: () => process.env.EDIT_PASSWORD || "",
});

export const config = { path: ["/api/content", "/api/login", "/api/upload", "/api/img/*"] };
