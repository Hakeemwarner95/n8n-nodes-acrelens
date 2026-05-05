import {
  IHookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  NodeOperationError,
} from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * AcreLens Trigger — webhook receiver for completed reports.
 *
 * UX:
 *   1. User drops this node into a workflow.
 *   2. n8n exposes a Webhook URL on the node.
 *   3. User pastes that URL into the AcreLens action's `webhook_url` field
 *      (or sets it as their account-wide default at /dashboard/webhooks).
 *   4. When AcreLens finishes a report it POSTs to the URL with headers:
 *        X-AcreLens-Signature: t=<unix_ts>,v1=<hex_hmac_sha256>
 *        X-AcreLens-Event: report.completed
 *        X-AcreLens-Delivery: <delivery_id>
 *   5. This node verifies the HMAC against the user's webhookSecret credential
 *      and emits the parsed body downstream.
 *
 * Validated against src/lib/api/webhooks.ts:
 *   - Format: t=<unix_ts>,v1=<hex>      (lib/api/webhooks.ts:125,136)
 *   - Algo:   HMAC-SHA256                (lib/api/webhooks.ts:133)
 *   - Signed: `${timestamp}.${payloadBody}` (lib/api/webhooks.ts:134)
 */
export class AcreLensTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AcreLens Trigger',
    name: 'acreLensTrigger',
    icon: 'file:acrelens.svg',
    group: ['trigger'],
    version: 1,
    description:
      'Starts a workflow when AcreLens delivers a completed report via webhook.',
    defaults: {
      name: 'AcreLens Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'acreLensApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'acrelens',
      },
    ],
    properties: [
      {
        displayName: 'Verify Signature',
        name: 'verifySignature',
        type: 'boolean',
        default: true,
        description:
          'Whether to verify the X-AcreLens-Signature HMAC against your Webhook Signing Secret. Strongly recommended — disable only for local debugging.',
      },
      {
        displayName: 'Tolerance (Seconds)',
        name: 'tolerance',
        type: 'number',
        default: 300,
        typeOptions: { minValue: 0 },
        description:
          'Max age (in seconds) for the signed timestamp. Anything older is rejected to prevent replay attacks.',
        displayOptions: { show: { verifySignature: [true] } },
      },
      {
        displayName: 'Events',
        name: 'events',
        type: 'multiOptions',
        default: ['report.completed'],
        options: [
          { name: 'Report Completed', value: 'report.completed' },
          { name: 'Report Failed', value: 'report.failed' },
        ],
        description:
          'Which X-AcreLens-Event values pass through. Other events are acked with 200 but not emitted.',
      },
    ],
  };

  // Hooks aren't used (no subscribe/unsubscribe API on AcreLens — the user
  // wires the webhook URL manually). Stubs satisfy the n8n interface.
  webhookMethods = {
    default: {
      checkExists: async function (this: IHookFunctions): Promise<boolean> {
        return true;
      },
      create: async function (this: IHookFunctions): Promise<boolean> {
        return true;
      },
      delete: async function (this: IHookFunctions): Promise<boolean> {
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const headers = this.getHeaderData() as Record<string, string>;
    const body = this.getBodyData() as Record<string, unknown>;

    const signatureHeader = headers['x-acrelens-signature'];
    const eventType = headers['x-acrelens-event'] || '';
    const deliveryId = headers['x-acrelens-delivery'] || '';

    const verify = this.getNodeParameter('verifySignature', true) as boolean;
    const tolerance = this.getNodeParameter('tolerance', 300) as number;
    const allowedEvents = this.getNodeParameter('events', [
      'report.completed',
    ]) as string[];

    if (verify) {
      if (!signatureHeader) {
        throw new NodeOperationError(
          this.getNode(),
          'Missing X-AcreLens-Signature header',
          { description: 'Disable "Verify Signature" only for local debugging.' }
        );
      }

      const creds = await this.getCredentials('acreLensApi');
      const secret = (creds.webhookSecret as string) || '';
      if (!secret) {
        throw new NodeOperationError(
          this.getNode(),
          'Webhook Signing Secret not set on credential',
          {
            description:
              'Open the AcreLens API credential and paste the secret from /dashboard/webhooks.',
          }
        );
      }

      // Reconstruct the raw body. n8n parses JSON for us, but signatures
      // are computed against the exact bytes AcreLens sent. If a raw body
      // buffer is available, prefer that; otherwise re-stringify (best-effort
      // — both ends use canonical JSON).
      const rawBody =
        ((req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8')) ??
        JSON.stringify(body);

      const parsed = parseSignatureHeader(signatureHeader);
      if (!parsed) {
        throw new NodeOperationError(
          this.getNode(),
          'Malformed X-AcreLens-Signature header',
          { description: `Got: ${signatureHeader}` }
        );
      }

      const ageSeconds = Math.floor(Date.now() / 1000) - parsed.timestamp;
      if (ageSeconds > tolerance) {
        throw new NodeOperationError(
          this.getNode(),
          `Webhook timestamp too old (${ageSeconds}s > ${tolerance}s tolerance)`,
          { description: 'Replay attack prevention. Increase tolerance if intentional.' }
        );
      }

      const expected = createHmac('sha256', secret)
        .update(`${parsed.timestamp}.${rawBody}`)
        .digest('hex');

      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(parsed.signature, 'utf8');
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new NodeOperationError(
          this.getNode(),
          'Invalid webhook signature',
          { description: 'HMAC mismatch — secret may be wrong or body was modified in flight.' }
        );
      }
    }

    if (allowedEvents.length > 0 && !allowedEvents.includes(eventType)) {
      // Ack but don't emit — this lets users add a single trigger and filter
      // event types in the node config rather than with a downstream IF node.
      return { workflowData: [[]] };
    }

    return {
      workflowData: [
        [
          {
            json: {
              event: eventType,
              delivery_id: deliveryId,
              ...body,
            },
          },
        ],
      ],
    };
  }
}

function parseSignatureHeader(
  header: string
): { timestamp: number; signature: string } | null {
  // Format: t=<unix_ts>,v1=<hex>
  const parts = header.split(',').map((p) => p.trim());
  let timestamp: number | null = null;
  let signature: string | null = null;
  for (const part of parts) {
    const [k, v] = part.split('=', 2);
    if (k === 't') timestamp = Number(v);
    else if (k === 'v1') signature = v;
  }
  if (!timestamp || !signature || Number.isNaN(timestamp)) return null;
  return { timestamp, signature };
}
