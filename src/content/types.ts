export type ContentType = "learn" | "archive" | "story" | "fieldwork" | "research" | "media" | "creative";

export type ContentSource = {
  label: string;
  locator: string;
  sourceId: string;
};

export type ArchiveIndexRecord = {
  id: string;
  title?: string;
  context: string;
  category: string;
  subcategory: string;
  sourceInstitution?: string;
  materialType?: string;
  paragraph: number | null;
  mediaName: string | null;
  format: string | null;
  width: number | null;
  height: number | null;
  sha256: string | null;
  verification: string;
  scriptUse: string;
  note?: string;
};

export type ArchiveStats = {
  total: number;
  categoryCounts: Record<string, number>;
  subcategoryCounts: Record<string, number>;
  scriptCandidateCount: number;
  pendingVerificationCount: number;
  sourceDocument: string;
  sourceSha256: string;
  indexedOn: string;
};

export type ContentEntry = {
  id: string;
  slug: string;
  type: ContentType;
  status: "public";
  title: string;
  eyebrow?: string;
  summary: string;
  body: string[];
  date: string | null;
  dateLabel?: string;
  places: string[];
  people: string[];
  tags: string[];
  cover: string | null;
  coverAlt?: string;
  featured?: boolean;
  verification: "verified" | "partial";
  rightsNote: string;
  sources: ContentSource[];
  archiveStats?: ArchiveStats;
  archiveRecords?: ArchiveIndexRecord[];
  externalUrl?: string;
  mediaMeta?: {
    duration?: string;
    resolution?: string;
    platform?: string;
    awardNote?: string;
  };
};

export const contentTypeLabels: Record<ContentType, string> = {
  learn: "认识侨批",
  archive: "侨批档案",
  story: "人物故事",
  fieldwork: "实践足迹",
  research: "研究成果",
  media: "影像档案",
  creative: "文创实验",
};
