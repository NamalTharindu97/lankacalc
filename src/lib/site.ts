const developmentSiteUrl = "http://localhost:3000";

export const siteName = "LankaCalc";
export const siteDescription =
  "Transparent calculators for Sri Lanka with visible workings, assumptions, and source-aware results.";

type SiteEnvironment = {
  NODE_ENV?: string;
  SITE_URL?: string;
  BETTER_AUTH_URL?: string;
};

export function getSiteUrl(environment: SiteEnvironment = process.env): URL {
  const configuredUrl = environment.SITE_URL ?? environment.BETTER_AUTH_URL;

  if (!configuredUrl) {
    if (environment.NODE_ENV === "production") {
      throw new Error("Set SITE_URL or BETTER_AUTH_URL to the public HTTPS origin.");
    }
    return new URL(developmentSiteUrl);
  }

  const url = new URL(configuredUrl);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (environment.NODE_ENV === "production" && url.protocol !== "https:" && !isLocalhost) {
    throw new Error("SITE_URL must use HTTPS in production.");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, getSiteUrl()).toString();
}
