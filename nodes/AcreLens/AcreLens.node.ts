import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { analysisFields, analysisOperations } from './analysis.descriptions';
import { reportFields, reportOperations } from './report.descriptions';

/**
 * AcreLens — declarative-style node.
 *
 * All HTTP routing is described inline via `routing.request` blocks on each
 * operation. n8n handles the HTTP request, retries, and error mapping; we
 * only declare what the request looks like.
 *
 * Resources:
 *   - analysis : POST /v1/analyze    (creates a report; async)
 *   - report   : GET  /v1/reports/{id} (fetches a report by ID)
 *
 * Webhook delivery of completed reports is handled by the companion
 * AcreLensTrigger node (see AcreLensTrigger.node.ts).
 */
export class AcreLens implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AcreLens',
    name: 'acreLens',
    icon: 'file:acrelens.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      'Run land-intelligence analyses on US property and fetch completed reports.',
    defaults: {
      name: 'AcreLens',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'acreLensApi',
        required: true,
      },
    ],
    requestDefaults: {
      baseURL: 'https://api.acrelens.com/v1',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Land Analysis',
            value: 'analysis',
          },
          {
            name: 'Report',
            value: 'report',
          },
        ],
        default: 'analysis',
      },
      ...analysisOperations,
      ...analysisFields,
      ...reportOperations,
      ...reportFields,
    ],
  };
}
