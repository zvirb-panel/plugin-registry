// Unit tests of the index check: each builds a registry folder in a temporary
// directory, signed with throwaway keys, and reads the problems it reports.
import { generateKeyPairSync } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { indexProblems } from "./check-index.mjs";
import { keyIdOf, rawPublicKey, signatureOf } from "./signing.mjs";

const schemaFile = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  "index.schema.json",
);
const folders = [];
after(() => {
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true });
});

const empty = { schema: 1, generatedAt: "2026-11-17T18:00:00Z", plugins: [] };

const minecraft = {
  id: "minecraft-java",
  name: "Minecraft: Java",
  summary: "Paper and Vanilla servers.",
  channel: "official",
  games: [{ id: "minecraft-java", name: "Minecraft: Java" }],
  versions: [
    {
      version: "0.1.0",
      pdk: "^0.4",
      publishedAt: "2026-11-17T17:50:00Z",
      archive: {
        url: "https://github.com/zvirb-panel/plugins/releases/download/minecraft-java-v0.1.0/minecraft-java-0.1.0.tar.gz",
        sha256: "a".repeat(64),
        size: 412337,
      },
    },
  ],
};

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { raw: rawPublicKey(publicKey), privateKey };
}

// A registry folder holding the index, signed by signer, with trusted in keys/.
function registry(index, { signer = keyPair(), trusted = [signer] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "registry-"));
  folders.push(root);
  copyFileSync(schemaFile, join(root, "index.schema.json"));
  mkdirSync(join(root, "keys"));
  for (const { raw } of trusted) {
    writeFileSync(
      join(root, "keys", `${keyIdOf(raw)}.pub`),
      `${raw.toString("base64")}\n`,
    );
  }
  const bytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  writeFileSync(join(root, "index.json"), bytes);
  writeFileSync(
    join(root, "index.json.sig"),
    JSON.stringify(signatureOf(bytes, signer.privateKey)),
  );
  return root;
}

test("an empty, signed index holds", () => {
  assert.deepEqual(indexProblems(registry(empty)), []);
});

test("a signed index listing a plugin holds", () => {
  assert.deepEqual(
    indexProblems(registry({ ...empty, plugins: [minecraft] })),
    [],
  );
});

test("a channel other than official breaks the schema", () => {
  const paid = { ...minecraft, channel: "paid" };
  const problems = indexProblems(registry({ ...empty, plugins: [paid] }));
  assert.match(
    problems.join("\n"),
    /\/plugins\/0\/channel must be equal to constant/,
  );
});

test("an archive outside the plugins releases breaks the schema", () => {
  const [version] = minecraft.versions;
  const elsewhere = {
    ...minecraft,
    versions: [
      {
        ...version,
        archive: { ...version.archive, url: "https://example.com/x.tar.gz" },
      },
    ],
  };
  const problems = indexProblems(registry({ ...empty, plugins: [elsewhere] }));
  assert.match(problems.join("\n"), /\/archive\/url must match pattern/);
});

test("a signature by a key keys/ doesn't hold is refused", () => {
  const problems = indexProblems(registry(empty, { trusted: [keyPair()] }));
  assert.match(
    problems.join("\n"),
    /names key [0-9a-f]{16}, which keys\/ doesn't hold/,
  );
});

test("an index changed after signing is refused", () => {
  const root = registry(empty);
  writeFileSync(
    join(root, "index.json"),
    `${JSON.stringify({ ...empty, plugins: [minecraft] }, null, 2)}\n`,
  );
  assert.match(indexProblems(root).join("\n"), /doesn't verify index.json/);
});

test("a plugin listed twice is refused", () => {
  const problems = indexProblems(
    registry({ ...empty, plugins: [minecraft, minecraft] }),
  );
  assert.deepEqual(problems, ["index.json lists plugin minecraft-java twice"]);
});

test("a key file named for another key is refused", () => {
  const signer = keyPair();
  const root = registry(empty, { signer });
  writeFileSync(
    join(root, "keys", "0000000000000000.pub"),
    `${keyPair().raw.toString("base64")}\n`,
  );
  assert.match(
    indexProblems(root).join("\n"),
    /keys\/0000000000000000.pub holds key/,
  );
});
