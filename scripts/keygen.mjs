// Makes a signing key: the private half goes to the path given, which must be
// outside this repository, and the public half to keys/<id>.pub.
//   node scripts/keygen.mjs ~/.config/zvirb/registry-signing.pem
import { generateKeyPairSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { keyIdOf, rawPublicKey } from "./signing.mjs";

const [target] = process.argv.slice(2);
if (target === undefined) {
  console.error("usage: node scripts/keygen.mjs <private key path, outside the repository>");
  process.exit(1);
}
const path = resolve(target);
if (!relative(process.cwd(), path).startsWith("..")) {
  console.error(`${target} is inside the repository; a private key must never be committed`);
  process.exit(1);
}
if (existsSync(path)) {
  console.error(`${target} exists; pick a new path rather than overwrite a key`);
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
writeFileSync(path, privateKey.export({ format: "pem", type: "pkcs8" }), { mode: 0o600 });
const raw = rawPublicKey(publicKey);
const id = keyIdOf(raw);
writeFileSync(join("keys", `${id}.pub`), `${raw.toString("base64")}\n`);
console.log(`private key: ${path}`);
console.log(`public key: keys/${id}.pub`);
