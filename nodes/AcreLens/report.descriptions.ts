import { INodeProperties } from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: { resource: ['report'] },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        action: 'Get a land analysis report',
        description:
          'Looks up a report by ID. Returns partial data while the analysis is still processing and the full structured report once complete.',
        routing: {
          request: {
            method: 'GET',
            url: '=/reports/{{$parameter["reportId"]}}',
          },
        },
      },
    ],
    default: 'get',
  },
];

export const reportFields: INodeProperties[] = [
  {
    displayName: 'Report ID',
    name: 'reportId',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'rpt_01HY2ZABC123',
    description:
      'The report ID returned by the "Run Analysis" operation, or read from a webhook payload',
    displayOptions: {
      show: { resource: ['report'], operation: ['get'] },
    },
  },
];
