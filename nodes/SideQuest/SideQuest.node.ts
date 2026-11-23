import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const TEMPLATES = [
	{ name: 'Check a Place (In Person)', value: 'verify_location' },
	{ name: 'Photos of Something (In Person)', value: 'photo_proof' },
	{ name: 'Pick Up and Drop Off (In Person)', value: 'pickup_dropoff' },
	{ name: 'Inspect an Item (In Person)', value: 'inspect_item' },
	{ name: 'Be There for a Set Time (In Person)', value: 'be_present' },
	{ name: 'Anything Else in Person (In Person)', value: 'errand' },
	{ name: 'Phone Call (Remote)', value: 'phone_call' },
	{ name: 'Translation (Remote)', value: 'translation' },
	{ name: 'Check AI Output (Remote)', value: 'check_ai_output' },
	{ name: 'Record a Video (Remote)', value: 'video_capture' },
	{ name: 'Online Task (Remote)', value: 'online' },
];

const IN_PERSON = ['verify_location', 'photo_proof', 'pickup_dropoff', 'inspect_item', 'be_present', 'errand'];

const QUEST_ID_OPS = ['get', 'approve', 'dispute', 'cancel', 'getProof', 'sendMessage', 'getMessages', 'boost'];

export class SideQuest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SideQuest',
		name: 'sideQuest',
		icon: { light: 'file:sidequest.svg', dark: 'file:sidequest.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Hire verified people for real-world tasks: store checks, photos, phone calls, inspections, pickups, and more',
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
					{ name: 'Boost', value: 'boost', action: 'Raise the reward on an open quest' },
					{ name: 'Cancel', value: 'cancel', action: 'Cancel a quest before anyone claims it' },
					{ name: 'Create', value: 'create', action: 'Post a paid quest' },
					{ name: 'Dispute', value: 'dispute', action: 'Dispute submitted proof' },
					{ name: 'Get', value: 'get', action: 'Get a quest with its status and proof' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many quests' },
					{ name: 'Get Messages', value: 'getMessages', action: 'Read messages with the quester' },
					{ name: 'Get Proof', value: 'getProof', action: 'Get proof photos answers and call transcript' },
					{ name: 'Send Message', value: 'sendMessage', action: 'Send a message to the quester' },
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
				description: 'The exact task and what you want delivered, in plain everyday words. SideQuest turns it into short numbered steps for the quester.',
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
				displayName: 'I Confirm This Description Is Accurate and Complete',
				name: 'confirmAccurate',
				type: 'boolean',
				default: false,
				required: true,
				description: 'Whether you confirm the quest is described accurately. Required to post. Questers can flag a quest that is not as described, and a confirmed flag stops the account from posting.',
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'Reward (USD)',
				name: 'reward',
				type: 'number',
				typeOptions: { minValue: 5, maxValue: 1000, numberPrecision: 2 },
				default: 10,
				required: true,
				description: 'What the task pays',
				displayOptions: { show: { resource: ['quest'], operation: ['create'] } },
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Street address. For US addresses, SideQuest finds the spot, so latitude and longitude can stay 0.',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: IN_PERSON } },
			},
			{
				displayName: 'Where Exactly',
				name: 'where',
				type: 'string',
				default: '',
				description: 'The exact spot and how to reach it, beyond the address',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: IN_PERSON } },
			},
			{
				displayName: 'Latitude',
				name: 'lat',
				type: 'number',
				typeOptions: { numberPrecision: 6 },
				default: 0,
				description: 'Needed when there is no US street address',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: IN_PERSON } },
			},
			{
				displayName: 'Longitude',
				name: 'lng',
				type: 'number',
				typeOptions: { numberPrecision: 6 },
				default: 0,
				description: 'Needed when there is no US street address',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: IN_PERSON } },
			},
			{
				displayName: 'Drop-Off Address',
				name: 'dropoffAddress',
				type: 'string',
				default: '',
				required: true,
				description: 'Where the quester drops the item',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['pickup_dropoff'] } },
			},
			{
				displayName: 'Starts At',
				name: 'startsAt',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['be_present'] } },
			},
			{
				displayName: 'Ends At',
				name: 'endsAt',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['be_present'] } },
			},
			{
				displayName: 'Photo Check-In Every (Minutes)',
				name: 'checkinEvery',
				type: 'number',
				typeOptions: { minValue: 5 },
				default: 30,
				required: true,
				description: 'How often the quester takes a timed photo to show they are still there',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['be_present'] } },
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
				description: 'Whether the quester records the call, voicemails included (they announce the recording if someone answers)',
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
				displayName: 'Number to Call',
				name: 'translationNumber',
				type: 'string',
				default: '',
				required: true,
				placeholder: '+1 215 555 0100',
				description: 'The person the quester interprets for, with country code',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['translation'] } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Spanish',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['translation'] } },
			},
			{
				displayName: 'Video Minutes',
				name: 'videoMinutes',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 120 },
				default: 10,
				description: 'Total minutes of video needed',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['video_capture'] } },
			},
			{
				displayName: 'Camera View',
				name: 'videoView',
				type: 'options',
				options: [
					{ name: 'First Person (Phone at Eye Level)', value: 'first_person' },
					{ name: 'Third Person (Filmed From the Side)', value: 'third_person' },
				],
				default: 'first_person',
				displayOptions: { show: { resource: ['quest'], operation: ['create'], template: ['video_capture'] } },
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
					{ displayName: 'If Things Are Different', name: 'ifDifferent', type: 'string', default: '', description: 'What the quester should do if the place or item is not as expected' },
					{ displayName: 'Max Total (USD)', name: 'maxTotal', type: 'number', default: 0, description: 'Fail instead of posting if reward plus fee is above this. 0 means no limit.' },
					{
						displayName: 'Proof Checklist',
						name: 'proofTemplate',
						type: 'options',
						options: [
							{ name: 'Item Inspection', value: 'item_inspection' },
							{ name: 'None', value: '' },
							{ name: 'Phone Call', value: 'phone_call' },
							{ name: 'Pickup and Drop-Off', value: 'pickup_dropoff' },
							{ name: 'Store Check', value: 'store_check' },
							{ name: 'Vehicle Inspection', value: 'vehicle_inspection' },
							{ name: 'Video Capture', value: 'video_capture' },
						],
						default: '',
						description: 'A ready-made checklist and required proof for common jobs',
					},
					{ displayName: 'Steps', name: 'steps', type: 'string', typeOptions: { rows: 4 }, default: '', description: 'Your own ordered steps, one per line. Leave empty and SideQuest writes simple numbered steps from the task.' },
					{ displayName: 'Who', name: 'who', type: 'string', default: '', description: 'Anyone the quester should talk to or avoid' },
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
				displayOptions: { show: { resource: ['quest'], operation: QUEST_ID_OPS } },
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
				displayName: 'Message',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['quest'], operation: ['sendMessage'] } },
			},
			{
				displayName: 'New Reward (USD)',
				name: 'newReward',
				type: 'number',
				typeOptions: { minValue: 5, maxValue: 1000, numberPrecision: 2 },
				default: 15,
				required: true,
				description: 'The higher reward. The difference is charged from your balance or saved card.',
				displayOptions: { show: { resource: ['quest'], operation: ['boost'] } },
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
				typeOptions: { minValue: 1 },
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

		const lines = (v: unknown) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);

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
					if (extra.who) brief.who = extra.who;
					if (extra.ifDifferent) brief.if_different = extra.ifDifferent;
					const body: IDataObject = {
						template,
						title: this.getNodeParameter('title', i) as string,
						reward_usd: this.getNodeParameter('reward', i) as number,
						brief,
						details: {},
						funding: (extra.funding as string) || 'auto',
						confirm_accurate: this.getNodeParameter('confirmAccurate', i) as boolean,
					};
					const details = body.details as IDataObject;
					if (IN_PERSON.includes(template)) {
						const where = this.getNodeParameter('where', i, '') as string;
						const address = String(this.getNodeParameter('address', i, '')).trim();
						brief.where = where || address;
						if (address) details.address = address;
						const lat = this.getNodeParameter('lat', i, 0) as number;
						const lng = this.getNodeParameter('lng', i, 0) as number;
						if (lat || lng) {
							body.lat = lat;
							body.lng = lng;
						} else if (!address) {
							throw new NodeOperationError(this.getNode(), 'In-person quests need a street address or a latitude and longitude.', { itemIndex: i });
						}
					}
					if (template === 'pickup_dropoff') details.dropoff_address = this.getNodeParameter('dropoffAddress', i) as string;
					if (template === 'be_present') {
						body.starts_at = new Date(this.getNodeParameter('startsAt', i) as string).toISOString();
						body.ends_at = new Date(this.getNodeParameter('endsAt', i) as string).toISOString();
						body.checkin_every_minutes = this.getNodeParameter('checkinEvery', i) as number;
					}
					if (template === 'phone_call') {
						const numbers = String(this.getNodeParameter('phoneNumbers', i, ''))
							.split(/[\n,;]+/)
							.map((s) => s.trim())
							.filter((s) => s.replace(/\D/g, '').length >= 7);
						if (!numbers.length) throw new NodeOperationError(this.getNode(), 'Enter at least one phone number to call, with country code.', { itemIndex: i });
						if (numbers.length > 25) throw new NodeOperationError(this.getNode(), 'A phone call quest can have up to 25 numbers.', { itemIndex: i });
						const callDetails: IDataObject = {
							number: numbers[0],
							if_no_answer: this.getNodeParameter('ifNoAnswer', i, 'voicemail'),
							record: this.getNodeParameter('recordCall', i, false),
						};
						if (numbers.length > 1) callDetails.numbers = numbers;
						const callback = String(this.getNodeParameter('callbackNumber', i, '')).trim();
						if (callback) callDetails.callback_number = callback;
						details.call = callDetails;
					}
					if (template === 'translation') {
						body.language = this.getNodeParameter('language', i) as string;
						details.call = { number: this.getNodeParameter('translationNumber', i) as string };
					}
					if (template === 'video_capture') {
						details.video = { min_minutes: this.getNodeParameter('videoMinutes', i, 10), view: this.getNodeParameter('videoView', i, 'first_person') };
					}
					if (extra.country) body.country = extra.country;
					if (extra.maxTotal) body.max_total_usd = extra.maxTotal;
					if (extra.proofTemplate) body.proof_template = extra.proofTemplate;
					const checklist = lines(extra.checklist);
					if (checklist.length) details.checklist = checklist;
					const steps = lines(extra.steps);
					if (steps.length) details.steps = steps;
					res = await call('POST', '/v1/quests', body);
				} else if (operation === 'getAll') {
					const status = this.getNodeParameter('status', i) as string;
					const list = await call('GET', '/v1/quests', undefined, { limit: this.getNodeParameter('limit', i) as number, ...(status ? { status } : {}) });
					for (const q of (list as IDataObject[]) || []) out.push({ json: q, pairedItem: { item: i } });
					continue;
				} else {
					const path = '/v1/quests/' + encodeURIComponent(this.getNodeParameter('questId', i) as string);
					if (operation === 'get') {
						res = await call('GET', path);
					} else if (operation === 'approve') {
						const rating = this.getNodeParameter('rating', i, 0) as number;
						res = await call('POST', path + '/approve', rating ? { rating } : {});
					} else if (operation === 'dispute') {
						res = await call('POST', path + '/dispute', { reason: this.getNodeParameter('reason', i) as string });
					} else if (operation === 'cancel') {
						res = await call('POST', path + '/cancel', {});
					} else if (operation === 'getProof') {
						res = await call('GET', path + '/proof');
					} else if (operation === 'getMessages') {
						res = await call('GET', path + '/messages');
					} else if (operation === 'sendMessage') {
						res = await call('POST', path + '/messages', { text: this.getNodeParameter('text', i) as string });
					} else if (operation === 'boost') {
						res = await call('POST', path + '/boost', { new_reward_usd: this.getNodeParameter('newReward', i) as number });
					}
				}
				const json = Array.isArray(res) ? { items: res } : ((res || {}) as IDataObject);
				out.push({ json: json as IDataObject, pairedItem: { item: i } });
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
