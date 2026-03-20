# atoz-web

Landing page and Apple App Site Association (AASA) for [atoz.cash](https://atoz.cash), powering universal links for the [Zodl](https://apps.apple.com/us/app/zodl-zcash-wallet/id1672392439) Zcash wallet.

## What it does

- **AASA** — Serves `/.well-known/apple-app-site-association` so iOS opens `/claim` links directly in Zodl.
- **Claim page** — `/claim#<base64payload>` decodes the payload client-side and shows the ZEC amount, memo, and a link to download Zodl. The `#fragment` never leaves the device, keeping the private key safe.

## Claim URL format

```
https://atoz.cash/claim#<base64-encoded JSON>
```

Payload fields:

| Field | Description        |
| ----- | ------------------ |
| `k`   | Private key        |
| `a`   | ZEC amount         |
| `h`   | Block height       |
| `m`   | Memo (optional)    |

## Development

```sh
pnpm install
pnpm dev
```

## Deployment

Deployed to Cloudflare Pages from this repo. The `public/_headers` file ensures the AASA is served with `Content-Type: application/json`.

:)
