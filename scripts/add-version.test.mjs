import { test } from "node:test";
import assert from "node:assert/strict";
import { withVersion } from "./add-version.mjs";

const release = (version) => ({
  plugin: {
    id: "minecraft-java",
    name: "Minecraft: Java",
    summary: "Paper and Vanilla servers.",
    games: [{ id: "minecraft-java", name: "Minecraft: Java" }],
  },
  version,
  pdk: "^0.4",
  archive: {
    url: `https://github.com/zvirb-panel/plugins/releases/download/minecraft-java-v${version}/minecraft-java-${version}.tar.gz`,
    sha256: "a".repeat(64),
    size: 1,
  },
});
const empty = { schema: 1, generatedAt: "2026-11-17T18:00:00Z", plugins: [] };

test("a first release adds the plugin as official", () => {
  const index = withVersion(empty, release("0.1.0"), "2026-11-18T09:00:00Z");

  assert.equal(index.plugins.length, 1);
  assert.equal(index.plugins[0].channel, "official");
  assert.deepEqual(
    index.plugins[0].versions.map((v) => [v.version, v.publishedAt]),
    [["0.1.0", "2026-11-18T09:00:00Z"]],
  );
});

test("a later release adds a version and keeps the earlier", () => {
  const first = withVersion(empty, release("0.1.0"), "2026-11-18T09:00:00Z");

  const index = withVersion(first, release("0.2.0"), "2026-11-19T09:00:00Z");

  assert.deepEqual(
    index.plugins[0].versions.map((v) => v.version),
    ["0.1.0", "0.2.0"],
  );
});

test("a version already in the index is refused", () => {
  const first = withVersion(empty, release("0.1.0"), "2026-11-18T09:00:00Z");

  const result = withVersion(first, release("0.1.0"), "2026-11-19T09:00:00Z");

  assert.match(
    result.message,
    /minecraft-java 0\.1\.0 is in the index already/,
  );
});
