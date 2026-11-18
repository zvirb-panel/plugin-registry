# plugin-registry

The signed plugin index, its icons and art, and the public keys that verify it.

The index format arrives with the `registry-index` change in stage 07 of the v1 roadmap. Until then this repository holds only its tooling: no `index.json`, no schema and no keys.

## Working here

Node is pinned in `mise.toml`.

```
mise run check   # prettier --check on every JSON and Markdown file
mise run fmt     # prettier --write on the same files
```
