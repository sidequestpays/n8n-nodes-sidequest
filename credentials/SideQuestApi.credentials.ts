import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class SideQuestApi implements ICredentialType {
	name = 'sideQuestApi';

	displayName = 'SideQuest API';

	icon: Icon = { light: 'file:../nodes/SideQuest/sidequest.svg', dark: 'file:../nodes/SideQuest/sidequest.dark.svg' };

	documentationUrl = 'https://sidequestpays.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'An owner or agent key from sidequestpays.com, starting with sq_live_. Use a capped agent key for workflows.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://sidequestpays.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/balance',
		},
	};
}
