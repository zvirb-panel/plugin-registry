// Adds a released version to index.json, from the description plugins' pack
// script printed, making the plugin's entry on its first release. Sign the
// index afterwards; sign.mjs stamps its time.
//   node scripts/add-version.mjs <release.json>
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** index with release's version added, or an Error saying why it can't be. */
export function withVersion(index, release, publishedAt) {
  const { plugin, version, pdk, archive } = release;
  const entry = { version, pdk, publishedAt, archive };
  const existing = index.plugins.find((p) => p.id === plugin.id);
  if (existing === undefined) {
    const added = { ...plugin, channel: "official", versions: [entry] };
    return { ...index, plugins: [...index.plugins, added] };
  }
  if (existing.versions.some((v) => v.version === version)) {
    return new Error(`${plugin.id} ${version} is in the index already`);
  }
  // The name, summary and games follow the newest release.
  const updated = {
    ...existing,
    name: plugin.name,
    summary: plugin.summary,
    games: plugin.games,
    versions: [...existing.versions, entry],
  };
  return {
    ...index,
    plugins: index.plugins.map((p) => (p.id === plugin.id ? updated : p)),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [releasePath] = process.argv.slice(2);
  if (releasePath === undefined) {
    console.error("usage: node scripts/add-version.mjs <release.json>");
    process.exit(1);
  }
  const release = JSON.parse(readFileSync(releasePath, "utf8"));
  const index = JSON.parse(readFileSync("index.json", "utf8"));
  const publishedAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const next = withVersion(index, release, publishedAt);
  if (next instanceof Error) {
    console.error(`add-version: ${next.message}`);
    process.exit(1);
  }
  writeFileSync("index.json", `${JSON.stringify(next, null, 2)}\n`);
  console.log(`added ${release.plugin.id} ${release.version} to index.json`);
}
