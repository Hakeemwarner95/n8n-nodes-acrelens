import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * AcreLens uses simple API-key auth.
 *   Production keys: al_live_<32 alphanumeric>
 *   Test keys:       al_test_<32 alphanumeric>
 *
 * AcreLens accepts both `Authorization: Bearer` and `X-API-Key`. We send
 * `X-API-Key` because n8n's HTTP layer reserves Authorization for some of
 * its own auth types and AcreLens's middleware-auth.ts explicitly anticipates
 * gateway integrations using X-API-Key.
 */
export class AcreLensApi implements ICredentialType {
  name = 'acreLensApi';
  displayName = 'AcreLens API';
  documentationUrl = 'https://docs.acrelens.com';
  icon = 'file:acrelens.svg' as const;

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'Find or create one at https://www.acrelens.com/dashboard/api-keys. Production keys start with al_live_; test keys start with al_test_.',
    },
    {
      displayName: 'Webhook Signing Secret',
      name: 'webhookSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: false,
      description:
        'Optional. Required only when using the AcreLens Trigger node to verify HMAC signatures on incoming webhooks. Find it at https://www.acrelens.com/dashboard/webhooks.',
    },
  ];

  // Sent on every request when this credential is selected.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
        'User-Agent': 'AcreLens-n8n/0.1.0',
      },
    },
  };

  // Wired to n8n's "Test" button on the credential modal. Hits /v1/balance
  // because it's authenticated, non-billable, and returns customer + balance.
  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api.acrelens.com/v1',
      url: '/balance',
      method: 'GET',
    },
  };
}
