// Manual smoke test against the live Hubris API without a running n8n.
// Usage: HUBRIS_API_KEY=sk-gw-... node scripts/smoke.mjs [--video]
// Builds a fake execution context around dist/ and runs each operation once.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { Hubris } = require('../dist/nodes/Hubris/Hubris.node.js');
const { LmChatHubris } = require('../dist/nodes/LmChatHubris/LmChatHubris.node.js');

const apiKey = process.env.HUBRIS_API_KEY;
if (!apiKey) throw new Error('HUBRIS_API_KEY is required');
const baseUrl = process.env.HUBRIS_BASE_URL ?? 'https://api.hubris.pw/v1';
const withVideo = process.argv.includes('--video');
mkdirSync('scripts/out', { recursive: true });

const node = { name: 'Hubris', type: 'hubris', typeVersion: 1, position: [0, 0], parameters: {} };
const binaries = new Map();

function makeContext(params, items) {
	return {
		getInputData: () => items,
		getNode: () => node,
		continueOnFail: () => false,
		getCredentials: async () => ({ apiKey, baseUrl }),
		// Stubs used by the LangChain tracing callback inside @n8n/ai-node-sdk.
		addInputData: () => ({ index: 0 }),
		addOutputData: () => undefined,
		getExecutionCancelSignal: () => undefined,
		logger: { debug() {}, info() {}, warn() {}, error() {} },
		getNodeParameter(name, _i, fallback, opts) {
			const v = params[name] ?? fallback;
			if (opts?.extractValue && v && typeof v === 'object' && 'value' in v) return v.value;
			return v;
		},
		helpers: {
			async httpRequestWithAuthentication(_cred, o) {
				const url = new URL(o.url);
				for (const [k, val] of Object.entries(o.qs ?? {})) url.searchParams.set(k, String(val));
				const init = {
					method: o.method,
					headers: {
						...o.headers,
						Authorization: `Bearer ${apiKey}`,
						...(o.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
					},
					body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
					signal: AbortSignal.timeout(o.timeout ?? 300000),
				};
				// Local network flakiness (intermittent TLS drops) — retry transport errors only.
				let res;
				for (let attempt = 1; ; attempt++) {
					try {
						res = await fetch(url, init);
						break;
					} catch (error) {
						const transient = /fetch failed|ETIMEDOUT|ECONNRESET|timeout/i;
						if (attempt >= 4 || !transient.test(`${error.message} ${error.cause?.message ?? ''}`)) {
							throw error;
						}
						await new Promise((r) => setTimeout(r, 1500 * attempt));
					}
				}
				const headers = Object.fromEntries(res.headers.entries());
				let body;
				if (o.encoding === 'arraybuffer') body = Buffer.from(await res.arrayBuffer());
				else {
					const text = await res.text();
					try {
						body = JSON.parse(text);
					} catch {
						body = text;
					}
				}
				return o.returnFullResponse ? { statusCode: res.status, headers, body } : body;
			},
			assertBinaryData(i, prop) {
				const b = items[i]?.binary?.[prop];
				if (!b) throw new Error(`No binary "${prop}" on item ${i}`);
				return b;
			},
			async getBinaryDataBuffer(i, prop) {
				return binaries.get(items[i].binary[prop].id);
			},
			async prepareBinaryData(buffer, fileName, mimeType) {
				const id = `bin-${binaries.size + 1}`;
				binaries.set(id, buffer);
				return { id, fileName, mimeType, fileSize: `${buffer.length} B`, data: '' };
			},
		},
	};
}

async function run(label, params, items = [{ json: {} }]) {
	const started = Date.now();
	try {
		const ctx = makeContext(params, items);
		const [out] = await new Hubris().execute.call(ctx);
		const first = out[0];
		const summary = { ...first.json };
		if (typeof summary.embedding !== 'undefined') summary.embedding = `[${summary.embedding.length} floats]`;
		if (summary.output) summary.output = '[...]';
		console.log(`✅ ${label} (${Date.now() - started} ms)`);
		console.log('   ', JSON.stringify(summary).slice(0, 400));
		if (first.binary) {
			for (const [k, b] of Object.entries(first.binary)) {
				console.log(`    binary.${k}: ${b.fileName} ${b.mimeType} ${b.fileSize}`);
			}
		}
		return out;
	} catch (error) {
		console.log(`❌ ${label}: ${error.message}${error.description ? ` — ${error.description}` : ''}`);
		return null;
	}
}

async function listSearch(method, filter) {
	const ctx = makeContext({}, []);
	const res = await new Hubris().methods.listSearch[method].call(ctx, filter);
	console.log(`🔎 ${method}(${filter ?? ''}): ${res.results.length} models, first: ${res.results[0]?.name} (${res.results[0]?.description ?? ''})`);
}

const model = (value) => ({ mode: 'id', value });
const lmOnly = process.argv.includes('--lm-only');

if (!lmOnly) await run('account.getKey', { resource: 'account', operation: 'getKey' });
if (lmOnly) {
	// Skip the regular-node scenarios; only the Chat Model sub-node is exercised below.
} else {
for (const m of ['searchTextModels', 'searchEmbeddingModels', 'searchImageModels', 'searchTranscriptionModels', 'searchSpeechModels', 'searchVideoModels']) {
	await listSearch(m, m === 'searchTextModels' ? 'haiku' : undefined);
}

await run('text.chat simple', {
	resource: 'text', operation: 'chat', model: model('anthropic/claude-haiku-4.5'), promptMode: 'simple',
	systemPrompt: 'Answer in one word.', prompt: 'What color is the sky?', simplify: true, options: {},
});
await run('text.chat json_schema', {
	resource: 'text', operation: 'chat', model: model('openai/gpt-4o-mini'), promptMode: 'simple',
	prompt: 'Give me a city and its country.', simplify: true,
	options: { responseFormat: 'json_schema', jsonSchema: '{"type":"object","properties":{"city":{"type":"string"},"country":{"type":"string"}},"required":["city","country"],"additionalProperties":false}' },
});
await run('text.chat messages', {
	resource: 'text', operation: 'chat', model: model('anthropic/claude-haiku-4.5'), promptMode: 'messages',
	messagesJson: '[{"role":"user","content":"Say hi"}]', simplify: false, options: { max_tokens: 20 },
});
await run('text.responses', {
	resource: 'text', operation: 'responses', model: model('openai/gpt-4o-mini'), input: 'Say hello in French.', instructions: 'Be brief.', simplify: true, options: {},
});
await run('embeddings.embed batch', {
	resource: 'embeddings', operation: 'embed', model: model('openai/text-embedding-3-small'), input: '["hello","world"]', options: { dimensions: 64 },
});
const img = await run('image.generate', {
	resource: 'image', operation: 'generate', model: model('black-forest-labs/flux.2-klein-4b'), prompt: 'a red cube on white background', options: { size: '512x512' },
});
if (img?.[0]?.binary?.data) {
	writeFileSync('scripts/out/image.png', binaries.get(img[0].binary.data.id));
	await run('text.chat vision', {
		resource: 'text', operation: 'chat', model: model('google/gemini-2.5-flash'), promptMode: 'simple',
		prompt: 'What shape and color is on this image? Answer in three words.', simplify: true,
		options: { imageBinaryProperty: 'data' },
	}, img);
}
const speech = await run('audio.speech', {
	resource: 'audio', operation: 'speech', model: model('microsoft/mai-voice-2-flash'), input: 'Hello from Hubris nodes for n8n.', voice: 'en-US-Harper:MAI-Voice-2', options: {},
});
if (speech?.[0]?.binary?.data) {
	writeFileSync('scripts/out/speech.mp3', binaries.get(speech[0].binary.data.id));
	await run('audio.transcribe', {
		resource: 'audio', operation: 'transcribe', model: model('openai/whisper-1'), binaryPropertyName: 'data', options: { language: 'en' },
	}, speech);
}
if (withVideo) {
	await run('video.generate', {
		resource: 'video', operation: 'generate', model: model('bytedance/seedance-1-lite'), prompt: 'a paper boat floating on a pond', waitForCompletion: true,
		options: { duration: 5, pollInterval: 10, timeoutMinutes: 15 },
	});
}

}

// Chat Model sub-node: supplyData returns a LangChain ChatOpenAI; invoke it once.
// Retried because the connect timeout of the OpenAI client (10 s) trips on flaky local links.
for (let attempt = 1; attempt <= 3; attempt++) {
	try {
		const params = { model: model('anthropic/claude-haiku-4.5'), options: { maxTokens: 20, timeout: 60000, maxRetries: 0 } };
		const ctx = makeContext(params, []);
		const { response } = await new LmChatHubris().supplyData.call(ctx, 0);
		const answer = await response.invoke('Reply with the single word: pong');
		console.log(`✅ lmChatHubris.supplyData (attempt ${attempt}) → ${JSON.stringify(answer.content).slice(0, 80)}`);
		break;
	} catch (error) {
		console.log(`❌ lmChatHubris (attempt ${attempt}): ${error.message}`);
	}
}
