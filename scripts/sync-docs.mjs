/**
 * sync-docs.mjs — vendor the ops-repo MkDocs site into the dashboard.
 *
 * Reads the read-only clone at ../git/midnight-network-ops:
 *   - copies docs/**\/*.md into content/docs/ (verbatim content, two transforms below)
 *   - parses the `nav:` block of mkdocs.yml into lib/docs/manifest.ts
 *   - generates lib/docs/loader.ts (static MDX import registry, like the runbooks loader)
 *
 * Two source transforms keep the content renderable as plain markdown (no JSX
 * injected into content, so files stay `.md` with MDX `format: 'md'`):
 *   1. MkDocs admonitions  (`!!! note "Title"` + 4-space body)
 *      -> remark-directive containers (`:::note[Title]` ... `:::`)
 *   2. inter-doc links     (`](install-node-and-keys.md)`)
 *      -> dashboard routes  (`](/docs/fno-guides/mainnet/install-node-and-keys)`)
 *
 * Mermaid fenced blocks are left untouched; they render via a `pre` override.
 *
 * The ops clone is treated as READ-ONLY: this script only reads from it.
 *
 * Usage:  pnpm docs:sync
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OPS_REPO = path.resolve(ROOT, "..", "git", "midnight-network-ops");
const DOCS_SRC = path.join(OPS_REPO, "docs");
const MKDOCS_YML = path.join(OPS_REPO, "mkdocs.yml");

const CONTENT_OUT = path.join(ROOT, "content", "docs");
const MANIFEST_OUT = path.join(ROOT, "lib", "docs", "manifest.ts");
const LOADER_OUT = path.join(ROOT, "lib", "docs", "loader.ts");

// ───────────────────────────── helpers ─────────────────────────────

/** docs-relative file path -> route slug. index.md collapses to its dir. */
function pathToSlug(relPath) {
  let p = relPath.replace(/\\/g, "/").replace(/\.md$/, "");
  if (p === "index") return "";
  return p.replace(/\/index$/, "");
}

/** Recursively collect every .md file under a dir (skips dotted dirs / venvs). */
function walkMd(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // .venv-docs, etc.
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, base, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

// ─────────────────── transform 1: admonitions -> directives ───────────────────

const ADMONITION_RE = /^(!!!|\?\?\?)\+?\s+([A-Za-z][\w-]*)(?:\s+"([^"]*)")?\s*$/;

/**
 * Convert MkDocs admonitions to remark-directive containers and rewrite
 * inter-doc links. Operates line-by-line and ignores fenced code blocks.
 */
function transformContent(raw, relPath) {
  const lines = raw.split("\n");
  const out = [];
  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0].repeat(3);
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
      }
      out.push(line);
      continue;
    }

    if (!inFence) {
      const adm = line.match(ADMONITION_RE);
      if (adm) {
        const [, , type, title] = adm;
        // Consume the indented body (blank lines or >=4-space indent).
        const body = [];
        let j = i + 1;
        for (; j < lines.length; j++) {
          const bl = lines[j];
          if (bl.trim() === "") {
            body.push("");
            continue;
          }
          if (/^ {4}/.test(bl)) {
            body.push(bl.slice(4));
            continue;
          }
          break;
        }
        // Drop trailing blank lines inside the block.
        while (body.length && body[body.length - 1] === "") body.pop();

        const label = title ? `[${title}]` : "";
        out.push(`:::${type.toLowerCase()}${label}`);
        out.push("");
        for (const b of body) out.push(rewriteLinks(b, relPath));
        out.push("");
        out.push(":::");
        i = j - 1;
        continue;
      }

      out.push(rewriteLinks(line, relPath));
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

// ─────────────────── transform 2: inter-doc link rewriting ───────────────────

/** Rewrite relative `*.md` markdown links to /docs routes. Leaves URLs alone. */
function rewriteLinks(line, relPath) {
  const fromDir = path.posix.dirname(relPath.replace(/\\/g, "/"));
  return line.replace(/\]\(([^)]+)\)/g, (whole, target) => {
    // Skip external links, anchors-only, mail, and already-absolute routes.
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole;
    const [pathPart, anchor] = target.split("#");
    if (!/\.md$/.test(pathPart)) return whole;
    const resolved = path.posix.normalize(path.posix.join(fromDir, pathPart));
    const slug = pathToSlug(resolved);
    const route = slug ? `/docs/${slug}` : "/docs";
    return `](${anchor ? `${route}#${anchor}` : route})`;
  });
}

// ───────────────────────── mkdocs nav -> manifest ─────────────────────────

/** Extract just the `nav:` block so js-yaml never sees the `!!python/...` tags. */
function readNav() {
  const text = fs.readFileSync(MKDOCS_YML, "utf8");
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^nav:\s*$/.test(l));
  if (start === -1) throw new Error("Could not find `nav:` in mkdocs.yml");
  const block = ["nav:"];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "" || /^\s/.test(l)) block.push(l);
    else break; // first column-0 non-blank line ends the nav block
  }
  const parsed = yaml.load(block.join("\n"));
  return parsed.nav;
}

/** mkdocs nav (array of {Title: string | nav[]}) -> manifest tree. */
function buildManifest(nav) {
  return nav.map((item) => {
    const [title, value] = Object.entries(item)[0];
    if (typeof value === "string") {
      return { title, slug: pathToSlug(value) };
    }
    return { title, children: buildManifest(value) };
  });
}

// ─────────────────────────────── generate ───────────────────────────────

function emitManifest(manifest) {
  const banner =
    "// AUTO-GENERATED by scripts/sync-docs.mjs — do not edit by hand.\n" +
    "// Source of truth: git/midnight-network-ops/mkdocs.yml (nav).\n\n";
  const types =
    "export interface DocLeaf {\n  title: string;\n  slug: string;\n}\n\n" +
    "export interface DocSection {\n  title: string;\n  children: DocNode[];\n}\n\n" +
    "export type DocNode = DocLeaf | DocSection;\n\n" +
    "export function isSection(n: DocNode): n is DocSection {\n" +
    '  return "children" in n;\n}\n\n';
  const body = `export const DOCS_MANIFEST: DocNode[] = ${JSON.stringify(
    manifest,
    null,
    2,
  )};\n`;
  fs.writeFileSync(MANIFEST_OUT, banner + types + body);
}

function emitLoader(files) {
  const banner =
    "// AUTO-GENERATED by scripts/sync-docs.mjs — do not edit by hand.\n" +
    "// Static import registry for vendored docs (mirrors the runbooks loader).\n\n";
  const head =
    "export type DocImporter = () => Promise<{ default: React.ComponentType }>;\n\n" +
    "export const DOC_IMPORTERS: Record<string, DocImporter> = {\n";
  const entries = files
    .map((rel) => {
      const slug = pathToSlug(rel);
      return `  ${JSON.stringify(slug)}: () => import(${JSON.stringify(
        `@/content/docs/${rel}`,
      )}),`;
    })
    .join("\n");
  fs.writeFileSync(LOADER_OUT, banner + head + entries + "\n};\n");
}

// ─────────────────────────────── run ───────────────────────────────

function main() {
  if (!fs.existsSync(DOCS_SRC)) {
    throw new Error(`Docs source not found at ${DOCS_SRC}`);
  }

  // Clean + recreate the vendored content dir.
  fs.rmSync(CONTENT_OUT, { recursive: true, force: true });
  fs.mkdirSync(CONTENT_OUT, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });

  const files = walkMd(DOCS_SRC);
  for (const rel of files) {
    const raw = fs.readFileSync(path.join(DOCS_SRC, rel), "utf8");
    const transformed = transformContent(raw, rel);
    const dest = path.join(CONTENT_OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, transformed);
  }

  const manifest = buildManifest(readNav());
  emitManifest(manifest);
  emitLoader(files);

  console.log(
    `synced ${files.length} docs -> content/docs/\n` +
      `wrote ${path.relative(ROOT, MANIFEST_OUT)} and ${path.relative(
        ROOT,
        LOADER_OUT,
      )}`,
  );
}

main();
