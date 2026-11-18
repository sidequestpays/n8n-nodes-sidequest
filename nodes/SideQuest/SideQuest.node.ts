import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const TEMPLATES = [
	{ name: 'Check a Place (In Person)', value: 'verify_location' },
	{ name: 'Photos of Something (In Person)', value: 'photo_proof' },
	{ name: 'Pick Up and Drop Off (In Person)', value: 'pickup_dropoff' },
	{ name: 'Inspect an Item (In Person)', value: 'inspect_item' },
	{ name: 'Be There for a Set Time (In Person)', value: 'be_present' },
	{ name: 'Phone Call (Remote)', value: 'phone_call' },
	{ name: 'Translation (Remote)', value: 'translation' },
	{ name: 'Check AI Output (Remote)', value: 'check_ai_output' },
];

const REMOTE = ['phone_call', 'translation', 'check_ai_output'];

export class SideQuest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SideQuest',
		name: 'sideQuest',
		icon: { light: 'file:sidequest.svg', dark: 'file:sidequest.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Hire a verified person for a real-world task: check a place, take photos, make a phone call, inspect an item, or run a pickup',
		defaults: { name: 'SideQuest' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'sideQuestApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Quest', value: 'quest' },
					{ name: 'Balance', value: 'balance' },
				],
				default: 'quest',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['quest'] } },
				options: [
					{ name: 'Approve', value: 'approve', action: 'Approve proof and pay the quester' },
					{ name: 'Cancel', value: 'cancel', action: 'Cancel a quest before anyone claims it' },
					{ name: 'Create', value: 'create', action: 'Post a paid quest' },
					{ name: 'Dispute', value: 'dispute', action: 'Dispute submitted proof' },
					{ name: 'Get', value: 'get', action: 'Get a quest with its status and proof' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many quests' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['balance'] } },
				options: [{ name: 'Get', value: 'get', action: 'Get your prepaid balance' }],
				default: 'get',
			},
			{
				displayName: 'Quest Type',
				name: 'template',
				type: 'options',
				options: TEMPLATES,
				default: 'verify_location',
				required: true,
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				required: true,
				placeholder: "Check if Joe's Hardware at 412 Main St is open",
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'What to Do',
				name: 'what',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				description: 'The exact task and what you want delivered',
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'Proof Required',
				name: 'how',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				required: true,
				description: 'What the photos or written answer must show',
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'Reward (USD)',
				name: 'reward',
				type: 'number',
				typeOptions: { minValue: 5, maxValue: 1000, numberPrecision: 2 },
				default: 10,
				required: true,
				description: 'What the quester earns. A 20% fee (minimum $2) is added.',
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Street address for in-person quests',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['verify_location', 'photo_proof', 'pickup_dropoff', 'inspect_item', 'be_present'] } },
			},
			{
				displayName: 'Where Exactly',
				name: 'where',
				type: 'string',
				default: '',
				description: 'The exact spot and how to reach it, beyond the address',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['verify_location', 'photo_proof', 'pickup_dropoff', 'inspect_item', 'be_present'] } },
			},
			{
				displayName: 'Latitude',
				name: 'lat',
				type: 'number',
				typeOptions: { numberPrecision: 6 },
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['verify_location', 'photo_proof', 'pickup_dropoff', 'inspect_item', 'be_present'] } },
			},
			{
				displayName: 'Longitude',
				name: 'lng',
				type: 'number',
				typeOptions: { numberPrecision: 6 },
				default: 0,
				required: true,
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['verify_location', 'photo_proof', 'pickup_dropoff', 'inspect_item', 'be_present'] } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Spanish to English',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['translation'] } },
			},
			{
				displayName: 'Phone Numbers',
				name: 'phoneNumbers',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				required: true,
				placeholder: '+1 215 555 0100',
				description: 'The number to call, with country code. To have one quester call several numbers (up to 25), put one per line or separate them with commas.',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['phone_call'] } },
			},
			{
				displayName: 'If No Answer',
				name: 'ifNoAnswer',
				type: 'options',
				options: [
					{ name: 'Leave a Voicemail', value: 'voicemail' },
					{ name: 'Call up to 3 Times, Then Leave a Voicemail', value: 'retry_then_voicemail' },
				],
				default: 'voicemail',
				description: 'What the quester does when nobody picks up. Either counts as done.',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['phone_call'] } },
			},
			{
				displayName: 'Record Call',
				name: 'recordCall',
				type: 'boolean',
				default: false,
				description: 'Whether the quester records the call if someone answers (they announce the recording)',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['phone_call'] } },
			},
			{
				displayName: 'Callback Number',
				name: 'callbackNumber',
				type: 'string',
				default: '',
				placeholder: '+1 215 555 0199',
				description: 'Number the quester leaves in voicemails for callbacks',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['phone_call'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
				options: [
					{ displayName: 'Checklist', name: 'checklist', type: 'string', typeOptions: { rows: 3 }, default: '', description: 'Yes or no questions the quester must answer, one per line' },
					{ displayName: 'Country', name: 'country', type: 'string', default: '', description: 'For remote quests, only questers in this 2-letter country code can take it' },
					{ displayName: 'Deadline', name: 'when', type: 'string', default: '', description: 'When it must be done' },
					{
						displayName: 'Funding',
						name: 'funding',
						type: 'options',
						options: [
							{ name: 'Auto (Balance or Saved Card, Else Checkout Link)', value: 'auto' },
							{ name: 'Balance Only', value: 'balance' },
							{ name: 'Checkout Link', value: 'checkout' },
						],
						default: 'auto',
					},
					{ displayName: 'Max Total (USD)', name: 'maxTotal', type: 'number', default: 0, description: 'Fail instead of posting if reward plus fee is above this. 0 means no limit.' },
					{ displayName: 'Why', name: 'why', type: 'string', default: '', description: 'The purpose, so the quester can make good judgment calls' },
				],
			},
			{
				displayName: 'Quest ID',
				name: 'questId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'q_abc123',
				displayOptions: { show: { resource: ['quest'], operation: ['get', 'approve', 'dispute', 'cancel'] } },
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 5 },
				default: 0,
				description: 'Optional 1 to 5 star rating for the quester. 0 means no rating.',
				displayOptions: { show: { resource: ['quest'], operation: ['approve'] } },
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				required: true,
				description: 'What is wrong with the proof, specifically',
				displayOptions: { show: { resource: ['quest'], operation: ['dispute'] } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Claimed', value: 'claimed' },
					{ name: 'Disputed', value: 'disputed' },
					{ name: 'Open', value: 'open' },
					{ name: 'Paid', value: 'paid' },
					{ name: 'Refunded', value: 'refunded' },
					{ name: 'Submitted', value: 'submitted' },
				],
				default: '',
				displayOptions: { show: { resource: ['quest'], operation: ['getAll'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 200 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { resource: ['quest'], operation: ['getAll'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const creds = await this.getCredentials('sideQuestApi');
		const base = String(creds.baseUrl || 'https://sidequestpays.com').replace(/\/+$/, '');

		const call = async (method: IHttpRequestMethods, path: string, body?: IDataObject, qs?: IDataObject) => {
			try {
				return await this.helpers.httpRequestWithAuthentication.call(this, 'sideQuestApi', { method, url: base + path, body, qs, json: true });
			} catch (error) {
				throw new NodeApiError(this.getNode(), error as never);
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let res: unknown;
				if (resource === 'balance') {
					res = await call('GET', '/v1/balance');
				} else if (operation === 'create') {
					const template = this.getNodeParameter('template', i) as string;
					const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					const brief: IDataObject = {
						what: this.getNodeParameter('what', i) as string,
						how: this.getNodeParameter('how', i) as string,
					};
					if (extra.when) brief.when = extra.when;
					if (extra.why) brief.why = extra.why;
					const body: IDataObject = {
						template,
						title: this.getNodeParameter('title', i) as string,
						reward_usd: this.getNodeParameter('reward', i) as number,
						brief,
						details: {},
						funding: (extra.funding as string) || 'auto',
					};
					const details = body.details as IDataObject;
					if (!REMOTE.includes(template)) {
						const where = this.getNodeParameter('where', i, '') as string;
						const address = this.getNodeParameter('address', i, '') as string;
						brief.where = where || address;
						if (address) details.address = address;
						body.lat = this.getNodeParameter('lat', i) as number;
						body.lng = this.getNodeParameter('lng', i) as number;
						if (!body.lat && !body.lng) throw new NodeOperationError(this.getNode(), 'Latitude and longitude are required for in-person quests.', { itemIndex: i });
					}
					if (template === 'translation') body.language = this.getNodeParameter('language', i) as string;
					if (template === 'phone_call') {
						const numbers = String(this.getNodeParameter('phoneNumbers', i, ''))
							.split(/[\n,;]+/)
							.map((s) => s.trim())
							.filter((s) => s.replace(/\D/g, '').length >= 7);
						if (!numbers.length)
							throw new NodeOperationError(this.getNode(), 'Enter at least one phone number to call, with country code.', { itemIndex: i });
						if (numbers.length > 25)
							throw new NodeOperationError(this.getNode(), 'A phone call quest can have up to 25 numbers.', { itemIndex: i });
						const call: IDataObject = {
							number: numbers[0],
							if_no_answer: this.getNodeParameter('ifNoAnswer', i, 'voicemail') as string,
							record: this.getNodeParameter('recordCall', i, false) as boolean,
						};
						if (numbers.length > 1) call.numbers = numbers;
						const callback = String(this.getNodeParameter('callbackNumber', i, '')).trim();
						if (callback) call.callback_number = callback;
						details.call = call;
					}
					if (extra.country) body.country = extra.country;
					if (extra.maxTotal) body.max_total_usd = extra.maxTotal;
					const checklist = String(extra.checklist || '').split('\n').map((s) => s.trim()).filter(Boolean);
					if (checklist.length) details.checklist = checklist;
					res = await call('POST', '/v1/quests', body);
				} else if (operation === 'get') {
					res = await call('GET', '/v1/quests/' + encodeURIComponent(this.getNodeParameter('questId', i) as string));
				} else if (operation === 'getAll') {
					const status = this.getNodeParameter('status', i) as string;
					const list = await call('GET', '/v1/quests', undefined, { limit: this.getNodeParameter('limit', i) as number, ...(status ? { status } : {}) });
					for (const q of (list as IDataObject[]) || []) out.push({ json: q, pairedItem: { item: i } });
					continue;
				} else if (operation === 'approve') {
					const rating = this.getNodeParameter('rating', i, 0) as number;
					res = await call('POST', `/v1/quests/${encodeURIComponent(this.getNodeParameter('questId', i) as string)}/approve`, rating ? { rating } : {});
				} else if (operation === 'dispute') {
					res = await call('POST', `/v1/quests/${encodeURIComponent(this.getNodeParameter('questId', i) as string)}/dispute`, { reason: this.getNodeParameter('reason', i) as string });
				} else if (operation === 'cancel') {
					res = await call('POST', `/v1/quests/${encodeURIComponent(this.getNodeParameter('questId', i) as string)}/cancel`, {});
				}
				out.push({ json: (res || {}) as IDataObject, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [out];
	}
}
