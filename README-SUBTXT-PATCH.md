# OokVPN `/sub.txt` patch

This patch adds `public/sub.txt`, keeps it synchronized with `public/subscription.json`,
validates both files, adds matching Vercel response headers, and commits the new file
from GitHub Actions.

## Files

- `src/update.js` — writes `public/sub.txt` on every update.
- `src/validate.js` — validates the JSON payload and checks that both outputs match.
- `vercel.json` — adds headers for `/sub.txt`.
- `.github/workflows/update.yml` — stages `public/sub.txt` for automatic commits.

## Important format note

`/sub.txt` currently contains the same JSON payload as `/subscription.json`; only the
URL and response headers differ. This does **not** convert the file to a plain-text list
of `vless://` links. Confirm that the client you use accepts JSON content at `/sub.txt`
before switching its subscription URL.

## Apply

Copy these files into the matching paths in the repository, replacing the existing
versions, then commit and push. Once deployed, the endpoint will be available at
`https://YOUR-DOMAIN/sub.txt`.
