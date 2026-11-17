// Stamps index.json with the time, formats it, and signs its bytes into
// index.json.sig, with the private key at the path given.
//   node scripts/sign.mjs ~/.config/zvirb/registry-signing.pem
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { exitIfNotStarted } from "./spawn.mjs";
import { signatureOf } from "./signing.mjs";

const [keyPath] = process.argv.slice(2);
if (keyPath === undefined) {
  console.error("usage: node scripts/sign.mjs <private key path>");
  process.exit(1);
}
const privateKey = createPrivateKey(readFileSync(keyPath));

const index = JSON.parse(readFileSync("index.json", "utf8"));
index.generatedAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
writeFileSync("index.json", `${JSON.stringify(index, null, 2)}\n`);
// The signature covers the bytes as committed, so Prettier runs first.
const format = spawnSync("npm", ["exec", "--no-install", "--", "prettier", "--write", "index.json"], {
  stdio: "inherit",
});
exitIfNotStarted("prettier", format);
if (format.status !== 0) process.exit(format.status ?? 1);

const signature = signatureOf(readFileSync("index.json"), privateKey);
writeFileSync("index.json.sig", `${JSON.stringify(signature, null, 2)}\n`);
console.log(`signed index.json with key ${signature.keyId}`);
