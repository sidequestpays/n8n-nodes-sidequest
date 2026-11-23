import type { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, IPollFunctions } from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

const EVENTS = [
	{ name: 'Quest Accepted', value: 'claimed', description: 'A quester accepted the quest and is on it' },
	{ name: 'Proof Submitted', value: 'submitted', description: 'The quester sent proof for review' },
	{ name: 'Quest Paid', value: 'paid', description: 'Proof was approved and the quester was paid' },
	{ name: 'Quest Disputed', value: 'disputed', description: 'The proof is in dispute review' },
	{ name: 'Quest Refunded', value: 'refunded', description: 'The quest amount went back to your balance' },
	{ name: 'Quest Cancelled', value: 'cancelled', description: 'The quest was cancelled' },
];

export class SideQuestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SideQuest Trigger',
		name: 'sideQuestTrigger',
		icon: { light: 'file:sidequest.svg', dark: 'file:sidequest.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when one of your quests is accepted, gets proof, is paid, or is disputed',
		defaults: { name: 'SideQuest Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sideQuestApi', required: true }],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'events',
				type: 'multiOptions',
				options: EVENTS,
				default: ['submitted'],
				required: true,
				description: 'The quest changes that start the workflow',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const events = this.getNodeParameter('events', []) as string[];
		const creds = await this.getCredentials('sideQuestApi');
		const base = String(creds.baseUrl || 'https://sidequestpays.com').replace(/\/+$/, '');
		let list: IDataObject[];
		try {
			list = ((await this.helpers.httpRequestWithAuthentication.call(this, 'sideQuestApi', { method: 'GET', url: base + '/v1/quests', qs: { limit: 100 }, json: true })) || []) as IDataObject[];
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as never);
		}

		if (this.getMode() === 'manual') {
			const sample = list.find((q) => events.includes(String(q.status)));
			return sample ? [[{ json: { event: sample.status, quest: sample } }]] : null;
		}

		const data = this.getWorkflowStaticData('node');
		const seen = (data.statuses || {}) as Record<string, string>;
		const first = !data.statuses;
		const next: Record<string, string> = {};
		const fired: INodeExecutionData[] = [];
		for (const q of list) {
			const id = String(q.id);
			const status = String(q.status);
			next[id] = status;
			if (!first && seen[id] !== status && events.includes(status)) fired.push({ json: { event: status, previous_status: seen[id] || null, quest: q } });
		}
		data.statuses = next;
		return fired.length ? [fired.reverse()] : null;
	}
}
