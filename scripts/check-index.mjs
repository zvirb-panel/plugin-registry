// Fails, naming each reason, when index.json breaks its schema, repeats a
// plugin or a version, or isn't signed by a key in keys/.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv from "ajv/dist/2020.js";
import { keyIdOf, signatureProblem } from "./signing.mjs";

/** The raw public keys in a folder, by key id. A file whose name isn't its key's id is a problem. */
export function readKeys(folder) {
  const keys = new Map();
  const problems = [];
  for (const name of readdirSync(folder).filter((file) => file.endsWith(".pub"))) {
    const raw = Buffer.from(readFileSync(join(folder, name), "utf8").trim(), "base64");
    const id = keyIdOf(raw);
    if (raw.length !== 32) problems.push(`keys/${name} is not a 32-byte ed25519 key`);
    else if (name !== `${id}.pub`) problems.push(`keys/${name} holds key ${id}; name it ${id}.pub`);
    else keys.set(id, raw);
  }
  return { keys, problems };
}

function repeats(values) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

/** Everything wrong with the registry in root; an empty list when it holds. */
export function indexProblems(root) {
  const bytes = readFileSync(join(root, "index.json"));
  let index;
  try {
    index = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    return [`index.json is not JSON: ${error.message}`];
  }
  const schema = JSON.parse(readFileSync(join(root, "index.schema.json"), "utf8"));
  const validate = new Ajv({ allErrors: true }).compile(schema);
  if (!validate(index)) {
    return validate.errors.map((error) => `index.json${error.instancePath} ${error.message}`);
  }

  const problems = [];
  for (const id of repeats(index.plugins.map((plugin) => plugin.id))) {
    problems.push(`index.json lists plugin ${id} twice`);
  }
  for (const plugin of index.plugins) {
    for (const version of repeats(plugin.versions.map((entry) => entry.version))) {
      problems.push(`index.json lists ${plugin.id} ${version} twice`);
    }
  }

  const { keys, problems: keyProblems } = readKeys(join(root, "keys"));
  problems.push(...keyProblems);
  let signatureFile;
  try {
    signatureFile = JSON.parse(readFileSync(join(root, "index.json.sig"), "utf8"));
  } catch (error) {
    return [...problems, `index.json.sig can't be read: ${error.message}`];
  }
  const problem = signatureProblem(bytes, signatureFile, keys);
  if (problem !== null) problems.push(problem);
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = indexProblems(process.cwd());
  for (const problem of problems) console.error(problem);
  process.exit(problems.length === 0 ? 0 : 1);
}
