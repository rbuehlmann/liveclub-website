import { getRequestConfig } from "next-intl/server";
import messages from "../../messages/de.json";

// next-intl's App Router integration expects this config module to exist
// (its RSC-side provider throws "Couldn't find next-intl config file"
// without it) even for a single fixed locale. It must stay free of
// per-request APIs like cookies()/headers() so it keeps working under
// `output: "export"`, which prerenders everything at build time.
export default getRequestConfig(async () => ({
  locale: "de",
  messages,
}));
