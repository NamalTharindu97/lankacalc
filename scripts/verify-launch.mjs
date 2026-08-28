const expectedUrl = new URL(process.env.EXPECTED_SITE_URL ?? "");
const baseUrl = new URL(process.env.APP_BASE_URL ?? expectedUrl);
const allowInsecure = process.env.ALLOW_INSECURE_LAUNCH_CHECK === "true";
const redirectFrom = process.env.REDIRECT_FROM_URL ? new URL(process.env.REDIRECT_FROM_URL) : null;
const languageTags = ["en-LK", "si-LK", "ta-LK", "x-default"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([^\s=]+)=["']([^"']*)["']/g)].map(([, name, value]) => [name.toLowerCase(), value]));
}

function linkTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0]));
}

function metaTags(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]));
}

function decodeXml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

function requestUrl(publicUrl) {
  const url = new URL(publicUrl);
  return new URL(`${url.pathname}${url.search}`, baseUrl);
}

async function fetchOk(url, options) {
  const response = await fetch(url, options);
  assert(response.ok, `${url} returned ${response.status}.`);
  return response;
}

assert(process.env.EXPECTED_SITE_URL, "Set EXPECTED_SITE_URL to the canonical public origin.");
assert(expectedUrl.pathname === "/" && !expectedUrl.search && !expectedUrl.hash, "EXPECTED_SITE_URL must be an origin without a path, query, or fragment.");
if (!allowInsecure) {
  assert(expectedUrl.protocol === "https:", "EXPECTED_SITE_URL must use HTTPS.");
  assert(!["localhost", "127.0.0.1"].includes(expectedUrl.hostname), "EXPECTED_SITE_URL must not use a local hostname.");
}

const rootResponse = await fetch(baseUrl, { redirect: "manual" });
assert(rootResponse.status >= 300 && rootResponse.status < 400, `Root route returned ${rootResponse.status} instead of a locale redirect.`);
assert(new URL(rootResponse.headers.get("location"), baseUrl).pathname === "/en", "Root route did not redirect to /en.");

for (const endpoint of ["/api/health", "/api/ready"]) await fetchOk(new URL(endpoint, baseUrl));

if (redirectFrom) {
  const response = await fetch(redirectFrom, { redirect: "manual" });
  assert(response.status >= 300 && response.status < 400, `${redirectFrom.origin} did not redirect.`);
  assert(new URL(response.headers.get("location"), redirectFrom).origin === expectedUrl.origin, `${redirectFrom.origin} did not redirect to ${expectedUrl.origin}.`);
}

const robots = await (await fetchOk(new URL("/robots.txt", baseUrl))).text();
assert(robots.includes(`Sitemap: ${new URL("/sitemap.xml", expectedUrl)}`), "robots.txt does not advertise the canonical sitemap URL.");

const sitemapXml = await (await fetchOk(new URL("/sitemap.xml", baseUrl))).text();
const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(decodeXml(match[1])));
assert(sitemapUrls.length > 0, "The sitemap contains no URLs.");
assert(new Set(sitemapUrls.map(url => url.href)).size === sitemapUrls.length, "The sitemap contains duplicate URLs.");
assert(sitemapUrls.every(url => url.origin === expectedUrl.origin), "The sitemap contains a URL outside the canonical origin.");

for (let offset = 0; offset < sitemapUrls.length; offset += 10) {
  await Promise.all(sitemapUrls.slice(offset, offset + 10).map(async publicUrl => {
    const response = await fetch(requestUrl(publicUrl), { redirect: "manual" });
    assert(response.status === 200, `${publicUrl} returned ${response.status} instead of 200.`);
    const html = await response.text();
    const links = linkTags(html);
    const metas = metaTags(html);
    const canonical = links.find(link => link.rel === "canonical")?.href;
    assert(canonical === publicUrl.href, `${publicUrl} declares canonical ${canonical ?? "<missing>"}.`);

    const localeMatch = publicUrl.pathname.match(/^\/(en|si|ta)(\/.*)?$/);
    assert(localeMatch, `${publicUrl} does not use a supported locale path.`);
    const suffix = localeMatch[2] ?? "";
    const expectedAlternates = {
      "en-LK": new URL(`/en${suffix}`, expectedUrl).href,
      "si-LK": new URL(`/si${suffix}`, expectedUrl).href,
      "ta-LK": new URL(`/ta${suffix}`, expectedUrl).href,
      "x-default": new URL(`/en${suffix}`, expectedUrl).href,
    };
    for (const language of languageTags) {
      const alternate = links.find(link => link.rel === "alternate" && link.hreflang === language)?.href;
      assert(alternate === expectedAlternates[language], `${publicUrl} has invalid ${language} alternate ${alternate ?? "<missing>"}.`);
    }

    const robotsContent = metas.find(meta => meta.name === "robots")?.content?.toLowerCase().split(/\s*,\s*/) ?? [];
    assert(robotsContent.includes("index") && robotsContent.includes("follow") && !robotsContent.includes("noindex"), `${publicUrl} is not publicly indexable.`);
    const socialImage = metas.find(meta => meta.property === "og:image")?.content;
    assert(socialImage && new URL(socialImage).origin === expectedUrl.origin, `${publicUrl} has a missing or non-canonical social image.`);

    const jsonScripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert(jsonScripts.length > 0, `${publicUrl} has no structured data.`);
    for (const [, json] of jsonScripts) JSON.parse(json);

    if (!allowInsecure) {
      const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
      assert(!/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(head), `${publicUrl} exposes a local origin in metadata.`);
    }
  }));
}

const socialImageResponse = await fetchOk(requestUrl(new URL("/opengraph-image", expectedUrl)));
assert(socialImageResponse.headers.get("content-type")?.startsWith("image/png"), "The social preview is not a PNG image.");
const llmsResponse = await fetchOk(new URL("/llms.txt", baseUrl));
assert(llmsResponse.headers.get("content-type")?.startsWith("text/plain"), "llms.txt is not plain text.");

console.log(`Public launch contract verified for ${sitemapUrls.length} sitemap URLs at ${expectedUrl.origin}.`);
