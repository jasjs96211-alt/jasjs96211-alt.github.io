import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname, join, relative, resolve } from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const contentRoot = join(projectRoot, "content");
const errors = [];
const warnings = [];
const seenIds = new Map();
const seenSlugs = new Map();
const allowedTypes = new Set(["learn", "archive", "story", "fieldwork", "research", "media", "creative"]);
const sensitivePatterns = [
  { label: "电子邮箱", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "中国大陆手机号", regex: /(?<!\d)1[3-9]\d{9}(?!\d)/ },
  { label: "身份证号", regex: /(?<!\d)\d{17}[\dXx](?!\d)/ },
  { label: "学号", regex: /\b(?:ENG|ART|BUS|CHN|COM|CS|LAW|FIN)\d{5,}\b/i },
];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const path of walk(contentRoot).filter((item) => extname(item) === ".json")) {
  const rel = relative(projectRoot, path).replaceAll("\\", "/");
  let entry;
  try {
    entry = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${rel}: JSON无法解析（${error.message}）`);
    continue;
  }

  const expectedStatus = rel.includes("/public/") ? "public" : rel.includes("/draft/") || rel.includes("/imported-draft/") ? "draft" : null;
  if (expectedStatus && entry.status !== expectedStatus) errors.push(`${rel}: 路径状态应为 ${expectedStatus}，实际为 ${entry.status ?? "缺失"}`);
  if (entry.status === "private") errors.push(`${rel}: private 内容不能出现在可提交的 content 目录`);
  if (!allowedTypes.has(entry.type)) errors.push(`${rel}: 未知内容类型 ${entry.type ?? "缺失"}`);

  if (entry.status === "public") {
    for (const key of ["id", "slug", "title", "summary", "verification", "rightsNote"]) {
      if (!entry[key]) errors.push(`${rel}: 公开条目缺少 ${key}`);
    }
    if (!Array.isArray(entry.body) || entry.body.length === 0) errors.push(`${rel}: 公开条目 body 必须是非空数组`);
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) errors.push(`${rel}: 公开条目必须至少有一个来源`);
    for (const [index, source] of (entry.sources ?? []).entries()) {
      for (const key of ["sourceId", "label", "locator"]) {
        if (!source?.[key]) errors.push(`${rel}: sources[${index}] 缺少 ${key}`);
      }
    }
    if (entry.verification === "todo") errors.push(`${rel}: verification=todo 的条目不能进入 public`);
  }

  if (entry.type === "archive" && entry.archiveRecords) {
    if (!Array.isArray(entry.archiveRecords) || entry.archiveRecords.length === 0) {
      errors.push(`${rel}: archiveRecords 必须是非空数组`);
    } else {
      const recordIds = new Set();
      for (const [index, record] of entry.archiveRecords.entries()) {
        for (const key of ["id", "context", "category", "subcategory", "verification", "scriptUse"]) {
          if (!record?.[key]) errors.push(`${rel}: archiveRecords[${index}] 缺少 ${key}`);
        }
        if (record?.id && recordIds.has(record.id)) errors.push(`${rel}: archiveRecords[${index}] 编号重复：${record.id}`);
        if (record?.id) recordIds.add(record.id);
      }
      if (entry.archiveStats?.total !== entry.archiveRecords.length) {
        errors.push(`${rel}: archiveStats.total 与 archiveRecords 数量不一致`);
      }
    }
  }

  if (entry.id) {
    if (seenIds.has(entry.id)) errors.push(`${rel}: id 与 ${seenIds.get(entry.id)} 重复`);
    seenIds.set(entry.id, rel);
  }
  if (entry.slug) {
    const slugKey = `${entry.type}/${entry.slug}`;
    if (seenSlugs.has(slugKey)) errors.push(`${rel}: slug 与 ${seenSlugs.get(slugKey)} 重复`);
    seenSlugs.set(slugKey, rel);
  }

  if (entry.status === "public") {
    const serialized = JSON.stringify(entry);
    for (const pattern of sensitivePatterns) {
      if (pattern.regex.test(serialized)) errors.push(`${rel}: 检测到疑似${pattern.label}`);
    }
    if (entry.cover?.startsWith("/") && !existsSync(join(projectRoot, "public", entry.cover.slice(1)))) {
      warnings.push(`${rel}: cover 指向的文件不存在：${entry.cover}`);
    }
  }
}

if (warnings.length) {
  console.warn(`内容检查警告（${warnings.length}）:`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error(`内容检查失败（${errors.length}）:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`内容检查通过：${seenIds.size} 条结构化内容，0 个错误。`);
