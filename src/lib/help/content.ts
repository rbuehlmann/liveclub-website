import fs from "fs";
import path from "path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { HelpArticleFrontmatter, HelpArticleMeta, HelpHeading } from "./types";

// content/{locale}/{category}/{slug}.mdx — see project_liveclub_help_center
// memory (or the /help build itself) for the frontmatter schema. Only "de"
// has content today; the locale param throughout this module is there so
// adding en/fr/it later is a content addition, not a rewrite.
const CONTENT_ROOT = path.join(process.cwd(), "content");
export const DEFAULT_LOCALE = "de";

function categoryDir(locale: string, category: string): string {
  return path.join(CONTENT_ROOT, locale, category);
}

export function getAllArticles(locale: string = DEFAULT_LOCALE): HelpArticleMeta[] {
  const localeDir = path.join(CONTENT_ROOT, locale);
  if (!fs.existsSync(localeDir)) return [];

  const categories = fs
    .readdirSync(localeDir)
    .filter((entry) => fs.statSync(path.join(localeDir, entry)).isDirectory());

  const articles: HelpArticleMeta[] = [];
  for (const category of categories) {
    const dir = categoryDir(locale, category);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      articles.push({ ...(data as HelpArticleFrontmatter), category, slug });
    }
  }
  return articles;
}

export function getArticleSource(
  locale: string,
  category: string,
  slug: string
): { frontmatter: HelpArticleFrontmatter; content: string } | null {
  const filePath = path.join(categoryDir(locale, category), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { frontmatter: data as HelpArticleFrontmatter, content };
}

// Same slugger rehype-slug uses internally (see the MDXRemote rehypePlugins
// config in the article page) — a fresh instance per call so heading ids
// here exactly match what actually ends up in the rendered HTML, including
// the "-1", "-2" suffixes github-slugger adds for duplicate heading text.
export function extractHeadings(mdxSource: string): HelpHeading[] {
  const slugger = new GithubSlugger();
  const headings: HelpHeading[] = [];
  for (const line of mdxSource.split("\n")) {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const depth = match[1].length === 2 ? 2 : 3;
    headings.push({ depth, text: match[2].trim(), id: slugger.slug(match[2].trim()) });
  }
  return headings;
}
