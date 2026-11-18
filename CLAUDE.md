# plugin-registry

The registry of Zvirb plugins: a signed `index.json`, icons, art and public keys. Read the workspace `CLAUDE.md` and `.claude/rules/` first; they outrank this file.

## Layout

The signed index Zvirb installs plugins from (D-0074, D-0077), and the tooling that checks and signs it.

| Path                                                             | Holds                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.json`                                                     | The plugins Zvirb may install: each plugin's games and versions, each version one `tar.gz` archive by URL, sha256 and size. `generatedAt` is when it was signed; Zvirb refuses an index older than the last it accepted |
| `index.schema.json`                                              | The index's JSON Schema. `channel` accepts only `official`, and an archive must come from the `plugins` releases                                                                                                        |
| `index.json.sig`                                                 | `{ keyId, signature }`: the base64 ed25519 signature of `index.json`'s exact bytes                                                                                                                                      |
| `keys/<keyId>.pub`                                               | The public keys an index may be signed with, each the base64 of its 32 raw bytes, named by the first 16 hex digits of its sha256                                                                                        |
| `scripts/signing.mjs`                                            | Signing and verifying, shared by the scripts                                                                                                                                                                            |
| `scripts/check-index.mjs`, `check-index.test.mjs`                | Fails, naming each reason, on a schema break, a plugin or version listed twice, a misnamed key, or a signature no key in `keys/` verifies                                                                               |
| `scripts/keygen.mjs <path>`                                      | Writes a new private key to a path outside the repository, mode 0600, and its public key to `keys/`                                                                                                                     |
| `scripts/sign.mjs [path]`                                        | Stamps `generatedAt`, runs Prettier on `index.json`, and signs it into `index.json.sig` with the key at path, or with none the key in `REGISTRY_SIGNING_KEY`, as `plugins`' release workflow passes it                  |
| `scripts/add-version.mjs <release.json>`, `add-version.test.mjs` | Adds the version `plugins`' `pack.mjs` described to `index.json`, making the plugin's entry, as official, on its first release; a version already listed is refused                                                     |
| `mise.toml`                                                      | Pinned Node and the `check` and `fmt` tasks                                                                                                                                                                             |
| `package.json`, `package-lock.json`                              | Prettier and Ajv at exact versions                                                                                                                                                                                      |
| `.github/pull_request_template.md`                               | The workspace's PR template                                                                                                                                                                                             |
| `.github/`                                                       | No workflows: checks run locally only, through `mise run check`                                                                                                                                                         |
| `scripts/check-actions.mjs`                                      | Fails on a workflow `uses:` that isn't pinned to a commit SHA                                                                                                                                                           |
| `scripts/check-advisories.mjs`, `osv-scanner.toml`               | Runs `osv-scanner` over `package-lock.json`. An accepted advisory is an `[[IgnoredVulns]]` entry with `id`, `ignoreUntil` and `reason`. A lockfile entry without a `resolved` URL is not scanned.                       |

## Commands

| Command          | Does                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mise run check` | `prettier --check` on every JSON and Markdown file (a JSON syntax error fails it, naming the file and line), the index check's tests, the index check, then the pinned-actions check and `osv-scanner` |
| `mise run fmt`   | `prettier --write` on the same files                                                                                                                                                                   |

`check` installs the locked Prettier first (`npm ci`) when `package-lock.json` has changed.

## Conventions

- Commit scopes are `index`, `keys` and `ci`; see the `commits` skill. Tooling and documentation commits take no scope.
- Prettier's defaults apply; there is no config file. Run `mise run fmt` rather than formatting by hand.
- A new dependency or a change to the index format is a change to bring to the user first.
