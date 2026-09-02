// Requires a running `npm run dev` (local n8n on :5678). Creates a throwaway owner account.
// Drive the local n8n dev instance over its internal REST API: owner setup, credential,
// workflow with the Hubris node, execution. Throwaway — not part of the package.
const BASE = 'http://localhost:5678';
const apiKey = process.env.HUBRIS_API_KEY;
if (!apiKey) throw new Error('HUBRIS_API_KEY required');
let cookie = '';

async function api(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: { 'Content-Type': 'application/json', cookie, 'browser-id': 'smoke' },
		body: body ? JSON.stringify(body) : undefined,
	});
	const set = res.headers.get('set-cookie');
	if (set) cookie = set.split(';')[0];
	const text = await res.text();
	let json;
	try { json = JSON.parse(text); } catch { json = text; }
	return { status: res.status, json };
}

const owner = { email: 'smoke@example.com', firstName: 'Smoke', lastName: 'Test', password: 'SmokeTest12345' };
let r = await api('POST', '/rest/owner/setup', owner);
if (r.status !== 200) {
	r = await api('POST', '/rest/login', { emailOrLdapLoginId: owner.email, password: owner.password });
}
console.log('auth', r.status);

r = await api('GET', '/types/nodes.json');
const hubrisNodes = Array.isArray(r.json) ? r.json.filter((n) => /hubris/i.test(n.name)) : [];
console.log('registered nodes:', hubrisNodes.map((n) => `${n.name} (${n.displayName})`).join(', ') || JSON.stringify(r.json).slice(0, 200));

r = await api('POST', '/rest/credentials', { name: 'Hubris smoke 2', type: 'hubrisApi', data: { apiKey, baseUrl: 'https://api.hubris.pw/v1' } });
console.log('credential', r.status, r.json?.data?.id ?? JSON.stringify(r.json).slice(0, 200));
const credId = r.json?.data?.id;

r = await api('POST', '/rest/credentials/test', { credentials: { id: credId, name: 'Hubris smoke 2', type: 'hubrisApi', data: { apiKey, baseUrl: 'https://api.hubris.pw/v1' } } });
console.log('credential test', r.status, JSON.stringify(r.json).slice(0, 200));

const hubrisNode = (name, params, pos) => ({
	parameters: params,
	name,
	type: 'CUSTOM.hubris',
	typeVersion: 1,
	position: pos,
	retryOnFail: true,
	maxTries: 3,
	waitBetweenTries: 3000,
	credentials: { hubrisApi: { id: credId, name: 'Hubris smoke' } },
});
const nodes = [
	{ parameters: {}, name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0] },
	hubrisNode('Chat', {
		resource: 'text', operation: 'chat', model: { __rl: true, mode: 'id', value: 'anthropic/claude-haiku-4.5' },
		promptMode: 'simple', prompt: 'Reply with exactly: ok', simplify: true, options: {},
	}, [250, 0]),
	hubrisNode('Image', {
		resource: 'image', operation: 'generate', model: { __rl: true, mode: 'id', value: 'black-forest-labs/flux.2-klein-4b' },
		prompt: 'a green triangle on white', options: { size: '512x512' },
	}, [500, 0]),
	hubrisNode('Vision', {
		resource: 'text', operation: 'chat', model: { __rl: true, mode: 'id', value: 'google/gemini-2.5-flash' },
		promptMode: 'simple', prompt: 'Name the shape and color in two words.', simplify: true, options: { imageBinaryProperty: 'data' },
	}, [750, 0]),
	hubrisNode('Key', { resource: 'account', operation: 'getKey' }, [1000, 0]),
];
const connections = {
	Start: { main: [[{ node: 'Chat', type: 'main', index: 0 }]] },
	Chat: { main: [[{ node: 'Image', type: 'main', index: 0 }]] },
	Image: { main: [[{ node: 'Vision', type: 'main', index: 0 }]] },
	Vision: { main: [[{ node: 'Key', type: 'main', index: 0 }]] },
};
r = await api('POST', '/rest/workflows', { name: 'Hubris smoke', nodes, connections, settings: { executionOrder: 'v1' }, active: false });
console.log('workflow', r.status, r.json?.data?.id ?? JSON.stringify(r.json).slice(0, 300));
const wf = r.json?.data;

r = await api('POST', `/rest/workflows/${wf.id}/run`, { workflowData: wf, startNodes: [{ name: 'Start', sourceData: null }], triggerToStartFrom: { name: 'Start' } });
console.log('run', r.status, JSON.stringify(r.json).slice(0, 300));
const execId = r.json?.data?.executionId;

for (let i = 0; i < 60 && execId; i++) {
	await new Promise((res) => setTimeout(res, 3000));
	r = await api('GET', `/rest/executions/${execId}`);
	const e = r.json?.data;
	if (!e) { console.log('exec fetch', r.status, JSON.stringify(r.json).slice(0, 200)); break; }
	if (e.status === 'running' || e.status === 'new' || e.status === 'waiting') continue;
	console.log('execution status:', e.status);
	const run = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
	const results = run?.resultData?.runData ?? {};
	for (const [name, runs] of Object.entries(results)) {
		const first = runs[0];
		const out = first?.data?.main?.[0]?.[0];
		console.log(` - ${name}: ${first?.executionStatus} ${first?.error ? 'ERROR ' + first.error.message : ''} json=${JSON.stringify(out?.json ?? {}).slice(0, 160)} binary=${out?.binary ? Object.keys(out.binary).join(',') : '-'}`);
	}
	if (run?.resultData?.error) console.log('workflow error:', run.resultData.error.message);
	break;
}
