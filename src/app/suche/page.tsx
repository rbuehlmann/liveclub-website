import { redirect } from "next/navigation";

// The search UI now lives on the homepage itself — this route stays only
// so existing links/bookmarks to /suche keep working.
export default function SearchPage() {
  redirect("/");
}
