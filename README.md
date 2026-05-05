# n8n-nodes-acrelens

Community node for [AcreLens](https://www.acrelens.com) — the B2B land-intelligence API. Run land analyses (off-grid / rural-residential / recreational / investment) on US property and receive completed reports via webhook, all from inside an n8n workflow.

> [n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## What ships

| Node | Resource | Operation | Wraps |
|---|---|---|---|
| **AcreLens** | Land Analysis | Run Analysis | `POST /v1/analyze` |
| **AcreLens** | Report | Get | `GET /v1/reports/{id}` |
| **AcreLens Trigger** | — | Webhook receiver | Verifies AcreLens HMAC signatures and emits completed reports |

Authentication uses an API key in the `X-API-Key` header. The credential's optional **Webhook Signing Secret** field is what the trigger uses to verify HMAC-SHA256 signatures on incoming webhooks.

## Installation

### n8n Cloud

The node will be available in the **Community Nodes** browser once the verified-listing review lands. Until then, n8n Cloud users have to wait — the cloud platform doesn't support arbitrary npm installs.

### Self-hosted n8n

```bash
# in your n8n install directory (or globally on the machine running n8n)
npm install n8n-nodes-acrelens
```

Restart n8n. The **AcreLens** and **AcreLens Trigger** nodes will appear in the node panel.

### Docker

Add to your `docker-compose.yml` or Dockerfile:

```dockerfile
RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-acrelens
```

Or set the env var `N8N_COMMUNITY_PACKAGES=n8n-nodes-acrelens` (n8n auto-installs on startup).

## Quickstart

1. Create an AcreLens account at [acrelens.com/signup](https://www.acrelens.com/signup) — first 5 reports are free.
2. Generate an API key at [/dashboard/api-keys](https://www.acrelens.com/dashboard/api-keys). Use a `al_test_*` key for staging, `al_live_*` for production.
3. (Optional, only for the Trigger node) Set up a webhook signing secret at [/dashboard/webhooks](https://www.acrelens.com/dashboard/webhooks).
4. In n8n, add an **AcreLens API** credential. Paste the API key (and webhook secret if using the Trigger).
5. Drop an **AcreLens** node into your workflow.

### Pattern A — push (preferred)

Zero polling, ~0 latency.

```
[Anything] → AcreLens (Run Analysis, with webhook_url = AcreLens Trigger's URL)
                                  ⤵ ~90s later, async
                          AcreLens Trigger → [downstream nodes]
```

1. Drop an **AcreLens Trigger** node first, copy its production webhook URL.
2. In the **AcreLens** action node (Run Analysis), set the **Webhook URL** field to that URL.
3. The trigger will fire when the report completes, with the full report body.

### Pattern B — poll

Simpler, but burns workflow runs while waiting.

```
[Anything] → AcreLens (Run Analysis) → Wait (90s) → AcreLens (Get Report by ID)
```

## Local development

```bash
git clone https://github.com/Hakeemwarner95/n8n-nodes-acrelens.git
cd n8n-nodes-acrelens
npm install
npm run build

# Link into a local n8n install
npm link
cd ~/.n8n/custom    # create if missing: mkdir -p ~/.n8n/custom && cd ~/.n8n/custom && npm init -y
npm link n8n-nodes-acrelens

# Start n8n — your local node will load
n8n start
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Credential test returns 401 | Key is wrong, revoked, or your account is past-due. Check at [/dashboard/api-keys](https://www.acrelens.com/dashboard/api-keys). |
| Trigger fires but body is empty | Disable **Verify Signature** temporarily — if it works without verification, the issue is the secret. Copy from [/dashboard/webhooks](https://www.acrelens.com/dashboard/webhooks). |
| Trigger throws "timestamp too old" | AcreLens retries failed deliveries with exponential backoff. Increase **Tolerance (Seconds)** to 86400 (24h) if you intentionally process backlogged deliveries. |
| Run Analysis returns `report_id` but Get Report returns 404 immediately | Reports take ~90s. Wait, or use Pattern A. |

## Compatibility

- n8n version: `>=1.0`
- Node.js: `>=20.15`

## License

[MIT](./LICENSE)

## Links

- [AcreLens API docs](https://docs.acrelens.com)
- [AcreLens dashboard](https://www.acrelens.com/dashboard)
- [Source code](https://github.com/Hakeemwarner95/n8n-nodes-acrelens)
- [Report a bug](https://github.com/Hakeemwarner95/n8n-nodes-acrelens/issues)
