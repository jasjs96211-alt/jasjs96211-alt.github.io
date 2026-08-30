import type { ContentEntry, ContentType } from "./types";

const modules = import.meta.glob<ContentEntry>("../../content/public/**/*.json", {
  eager: true,
  import: "default",
});

export const publicContent = Object.values(modules).sort((a, b) => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return a.title.localeCompare(b.title, "zh-CN");
});

export function getContentByType(type: ContentType) {
  return publicContent.filter((entry) => entry.type === type);
}

export function getContentEntry(type: ContentType, slug: string) {
  return publicContent.find((entry) => entry.type === type && entry.slug === slug);
}

export function searchableText(entry: ContentEntry) {
  return [
    entry.title,
    entry.summary,
    ...entry.body,
    ...entry.tags,
    ...entry.places,
    ...entry.people,
    ...(entry.archiveRecords?.flatMap((record) => [
      record.id,
      record.title ?? "",
      record.context,
      record.category,
      record.subcategory,
      record.sourceInstitution ?? "",
      record.materialType ?? "",
      record.mediaName ?? "",
    ]) ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase("zh-CN");
}

export type { ArchiveIndexRecord, ArchiveStats, ContentEntry, ContentType } from "./types";
export { contentTypeLabels } from "./types";
