// ed25519 signatures over index.json's exact bytes (D-0074). A public key is
// kept as the base64 of its 32 raw bytes, which Go's ed25519 package reads as
// it is, and named by the first 16 hex digits of its sha256.
import { createHash, createPublicKey, sign, verify } from "node:crypto";

// The DER header Node needs in front of a raw ed25519 public key.
const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");

export function rawPublicKey(publicKey) {
  return publicKey.export({ format: "der", type: "spki" }).subarray(spkiPrefix.length);
}

export function keyIdOf(raw) {
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function publicKeyFromRaw(raw) {
  return createPublicKey({ key: Buffer.concat([spkiPrefix, raw]), format: "der", type: "spki" });
}

/** The signature file's content for these bytes. */
export function signatureOf(bytes, privateKey) {
  const raw = rawPublicKey(createPublicKey(privateKey));
  return { keyId: keyIdOf(raw), signature: sign(null, bytes, privateKey).toString("base64") };
}

/**
 * Why the signature doesn't verify the bytes, or null when it does. keys maps
 * a key id to its raw public key.
 */
export function signatureProblem(bytes, signatureFile, keys) {
  const { keyId, signature } = signatureFile ?? {};
  if (typeof keyId !== "string" || typeof signature !== "string") {
    return "index.json.sig needs a keyId and a signature";
  }
  const raw = keys.get(keyId);
  if (raw === undefined) return `index.json.sig names key ${keyId}, which keys/ doesn't hold`;
  if (!verify(null, bytes, publicKeyFromRaw(raw), Buffer.from(signature, "base64"))) {
    return `index.json.sig doesn't verify index.json with key ${keyId}`;
  }
  return null;
}
