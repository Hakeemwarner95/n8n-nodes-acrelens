import { INodeProperties } from 'n8n-workflow';

const ANALYSIS_MODES = [
  {
    name: 'Off-Grid (solar, water, septic, building codes)',
    value: 'off_grid',
  },
  {
    name: 'Rural Residential (everyday liveability)',
    value: 'rural_residential',
  },
  { name: 'Recreational (hunting, fishing, camping)', value: 'recreational' },
  {
    name: 'Investment (development potential, appreciation)',
    value: 'investment',
  },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
];

export const analysisOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: { resource: ['analysis'] },
    },
    options: [
      {
        name: 'Run Analysis',
        value: 'create',
        action: 'Run a land analysis',
        description:
          'Kicks off a new analysis. Returns immediately with a report ID; the full report (~90s later) is fetched via "Get Report" or delivered to your webhook URL.',
        routing: {
          request: {
            method: 'POST',
            url: '/analyze',
          },
        },
      },
    ],
    default: 'create',
  },
];

export const analysisFields: INodeProperties[] = [
  // ─── Run Analysis ─────────────────────────────────────────────
  {
    displayName: 'Address',
    name: 'address',
    type: 'string',
    required: true,
    default: '',
    placeholder: '123 Cabin Rd, Taos, NM',
    description: 'Full street address of the US property.',
    displayOptions: {
      show: { resource: ['analysis'], operation: ['create'] },
    },
    routing: { send: { type: 'body', property: 'address' } },
  },
  {
    displayName: 'State',
    name: 'state',
    type: 'options',
    required: true,
    default: 'NM',
    description: '2-letter US state code.',
    options: US_STATES.map((c) => ({ name: c, value: c })),
    displayOptions: {
      show: { resource: ['analysis'], operation: ['create'] },
    },
    routing: { send: { type: 'body', property: 'state' } },
  },
  {
    displayName: 'Mode',
    name: 'mode',
    type: 'options',
    required: true,
    default: 'off_grid',
    description: 'Which analytical lens to apply.',
    options: ANALYSIS_MODES,
    displayOptions: {
      show: { resource: ['analysis'], operation: ['create'] },
    },
    routing: { send: { type: 'body', property: 'mode' } },
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: { resource: ['analysis'], operation: ['create'] },
    },
    options: [
      {
        displayName: 'County',
        name: 'county',
        type: 'string',
        default: '',
        description:
          'Optional but recommended — improves regulation/zoning research.',
        routing: { send: { type: 'body', property: 'county' } },
      },
      {
        displayName: 'Acreage',
        name: 'acreage',
        type: 'number',
        default: 0,
        typeOptions: { minValue: 0 },
        routing: { send: { type: 'body', property: 'acreage' } },
      },
      {
        displayName: 'Asking Price (USD)',
        name: 'asking_price',
        type: 'number',
        default: 0,
        typeOptions: { minValue: 0 },
        description: 'Used for investment-mode value calculations.',
        routing: { send: { type: 'body', property: 'asking_price' } },
      },
      {
        displayName: 'Latitude',
        name: 'lat',
        type: 'number',
        default: 0,
        typeOptions: { minValue: -90, maxValue: 90 },
        description: 'Skips geocoding when provided alongside Longitude.',
        routing: { send: { type: 'body', property: 'lat' } },
      },
      {
        displayName: 'Longitude',
        name: 'lng',
        type: 'number',
        default: 0,
        typeOptions: { minValue: -180, maxValue: 180 },
        routing: { send: { type: 'body', property: 'lng' } },
      },
      {
        displayName: 'Webhook URL',
        name: 'webhook_url',
        type: 'string',
        default: '',
        placeholder: 'https://your-n8n.example.com/webhook/...',
        description:
          'Optional. AcreLens POSTs the completed report to this URL (HMAC-signed). Pair with the AcreLens Trigger node for zero-polling pipelines.',
        routing: { send: { type: 'body', property: 'webhook_url' } },
      },
    ],
  },
];
