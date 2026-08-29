const baseUrl = new URL(process.env.APP_BASE_URL ?? "http://127.0.0.1:3100");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchOk(path, options) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, options);
  assert(response.ok, `${url} returned ${response.status}.`);
  return response;
}

await fetchOk("/api/health");
await fetchOk("/api/ready");

const rootResponse = await fetch(new URL("/", baseUrl), { redirect: "manual" });
assert(rootResponse.status >= 300 && rootResponse.status < 400, `Root route returned ${rootResponse.status} instead of a locale redirect.`);
assert(new URL(rootResponse.headers.get("location"), baseUrl).pathname === "/en", "Root route did not redirect to /en.");

const home = await (await fetchOk("/en")).text();
const robotsMeta = [...home.matchAll(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/gi)].map(([, content]) => content.toLowerCase());
assert(robotsMeta.some(content => content.includes("noindex") && content.includes("nofollow")), "Private deployment does not declare noindex,nofollow.");

const robots = await (await fetchOk("/robots.txt")).text();
assert(/User-Agent:\s*\*/i.test(robots), "robots.txt has no default user-agent policy.");
await fetchOk("/sitemap.xml");
await fetchOk("/llms.txt");

console.log(`Private deployment contract verified at ${baseUrl.origin}.`);
