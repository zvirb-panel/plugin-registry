# plugin-registry

The registry of Zvirb plugins: a signed `index.json`, icons and public keys. Read the workspace `CLAUDE.md` and `CONSTITUTION.md` first; they outrank this file.

## Layout

Nothing but tooling yet. The index, its schema and the keys arrive with `registry-index` in stage 07, and this file gets their layout then.

| Path                                               | Holds                                                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mise.toml`                                        | Pinned Node and the `check` and `fmt` tasks                                                                                                                                                       |
| `package.json`, `package-lock.json`                | Prettier at an exact version                                                                                                                                                                      |
| `.github/pull_request_template.md`                 | The workspace's PR template                                                                                                                                                                       |
| `.github/`                                         | No workflows: checks run locally only, through `mise run check`                                                                                                                                   |
| `scripts/check-actions.mjs`                        | Fails on a workflow `uses:` that isn't pinned to a commit SHA                                                                                                                                     |
| `scripts/check-advisories.mjs`, `osv-scanner.toml` | Runs `osv-scanner` over `package-lock.json`. An accepted advisory is an `[[IgnoredVulns]]` entry with `id`, `ignoreUntil` and `reason`. A lockfile entry without a `resolved` URL is not scanned. |

## Commands

| Command          | Does                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mise run check` | `prettier --check` on every JSON and Markdown file (a JSON syntax error fails it, naming the file and line), then the pinned-actions check and `osv-scanner` |
| `mise run fmt`   | `prettier --write` on the same files                                                                                                                         |

`check` installs the locked Prettier first (`npm ci`) when `package-lock.json` has changed.

## Conventions

- Commit scopes are `index`, `keys` and `ci`; see the `commits` skill. Tooling and documentation commits take no scope.
- Prettier's defaults apply; there is no config file. Run `mise run fmt` rather than formatting by hand.
- A new dependency or a change to the index format is a change to bring to the user first.
