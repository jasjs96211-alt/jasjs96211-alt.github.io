import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, extname, join, relative, resolve } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error('请提供 Obsidian 目录，例如：npm run content:import -- "C:\\Campus\\侨批"');
  process.exit(1);
}

const sourceRoot = resolve(input);
if (!existsSync(sourceRoot)) {
  console.error(`目录不存在：${sourceRoot}`);
  process.exit(1);
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputRoot = join(projectRoot, "content", "imported-draft");
const allowedTypes = new Set(["learn", "archive", "story", "fieldwork", "research", "media", "creative"]);
const sensitivePatterns = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?<!\d)1[3-9]\d{9}(?!\d)/,
  /(?<!\d)\d{17}[\dXx](?!\d)/,
  /\b(?:ENG|ART|BUS|CHN|COM|CS|LAW|FIN)\d{5,}\b/i,
];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function scalar(value) {
  const clean = value.trim().replace(/^['"]|['"]$/g, "");
  if (clean === "null" || clean === "~") return null;
  if (clean === "true") return true;
  if (clean === "false") return false;
  if (clean.startsWith("[") && clean.endsWith("]")) {
    return clean.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  return clean;
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) return { data: {}, body: markdown };
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return { data: {}, body: markdown };
  const yaml = markdown.slice(3, end).trim();
  const data = {};
  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) data[match[1]] = scalar(match[2]);
  }
  return { data, body: markdown.slice(end + 4).trim() };
}

function makeSlug(candidate, filePath) {
  const normalized = String(candidate ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (normalized) return normalized;
  return `obsidian-${createHash("sha1").update(relative(sourceRoot, filePath)).digest("hex").slice(0, 10)}`;
}

function paragraphs(markdown) {
  return markdown
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.replace(/^#{1,6}\s+/gm, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

let imported = 0;
let privateSkipped = 0;
let sensitiveSkipped = 0;

for (const filePath of walk(sourceRoot).filter((path) => extname(path).toLowerCase() === ".md")) {
  const markdown = readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(markdown);
  const declaredStatus = data.status ?? data.visibility ?? "draft";
  if (declaredStatus === "private") {
    privateSkipped += 1;
    continue;
  }
  if (sensitivePatterns.some((pattern) => pattern.test(markdown))) {
    sensitiveSkipped += 1;
    continue;
  }

  const firstHeading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = String(data.title ?? firstHeading ?? basename(filePath, ".md"));
  const type = allowedTypes.has(data.type) ? data.type : "research";
  const slug = makeSlug(data.slug ?? basename(filePath, ".md"), filePath);
  const content = paragraphs(body);
  const entry = {
    id: `import-${createHash("sha1").update(relative(sourceRoot, filePath)).digest("hex").slice(0, 12)}`,
    slug,
    type,
    status: "draft",
    title,
    summary: String(data.summary ?? content[0] ?? "待整理"),
    body: content,
    date: data.date ?? null,
    dateLabel: data.date_label ?? "来自 Obsidian，待核验",
    places: Array.isArray(data.places) ? data.places : [],
    people: Array.isArray(data.people) ? data.people : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    cover: data.cover ?? null,
    verification: "todo",
    rightsNote: String(data.rights_note ?? "待确认公开权利与个人信息边界"),
    sources: [{ sourceId: "OBSIDIAN-IMPORT", label: "Obsidian/Campus", locator: relative(sourceRoot, filePath).replaceAll("\\", "/") }],
  };

  const destination = join(outputRoot, type);
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, `${slug}.json`), `${JSON.stringify(entry, null, 2)}\n`, "utf8");
  imported += 1;
}

console.log(`Obsidian 导入完成：${imported} 条进入草稿区；${privateSkipped} 条 private 跳过；${sensitiveSkipped} 条因疑似敏感信息跳过。`);
