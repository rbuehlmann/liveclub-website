export type HelpRole = "fan" | "redaktor" | "admin";
export type HelpPlatform = "web" | "ios" | "android";

export interface HelpCategory {
  slug: string;
  icon: string;
  label: string;
}

export interface HelpArticleFrontmatter {
  title: string;
  summary: string;
  category: string;
  roles?: HelpRole[];
  platforms?: HelpPlatform[];
  keywords?: string[];
  updated?: string;
}

export interface HelpArticleMeta extends HelpArticleFrontmatter {
  slug: string;
}

export interface HelpHeading {
  depth: 2 | 3;
  text: string;
  id: string;
}
