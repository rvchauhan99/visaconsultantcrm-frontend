/**
 * Canonical snake_case key generation for Document / Field masters.
 * Mirrors backend/utils/keys.py — must stay in sync.
 * Keys match /^[a-z][a-z0-9_]*$/
 */

const KEY_RE = /^[a-z][a-z0-9_]*$/;

export function slugifyKey(text, { fallbackPrefix = "item" } = {}) {
  let slug = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  let prefix = String(fallbackPrefix || "item")
    .trim()
    .toLowerCase();
  if (!KEY_RE.test(prefix)) prefix = "item";

  if (!slug || !KEY_RE.test(slug)) {
    if (slug && /^\d/.test(slug)) {
      slug = `${prefix}_${slug}`;
    } else {
      slug = prefix;
    }
    slug = slug.replace(/_+/g, "_").replace(/^_|_$/g, "");
  }
  if (!KEY_RE.test(slug)) slug = prefix;
  return slug;
}

/**
 * Return base, or base_2 / base_3 … when already present in existingKeys.
 */
export function nextUniqueKey(base, existingKeys = []) {
  const taken = new Set(
    (existingKeys || []).map((k) => String(k || "").toLowerCase()).filter(Boolean)
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) {
    n += 1;
    if (n > 10000) throw new Error(`Could not allocate unique key from '${base}'`);
  }
  return `${base}_${n}`;
}

export function previewMasterKey(text, existingKeys, fallbackPrefix = "item") {
  const base = slugifyKey(text, { fallbackPrefix });
  return nextUniqueKey(base, existingKeys);
}
