# n8n-nodes-hubris

Official [n8n](https://n8n.io) community nodes for [Hubris](https://hubris.pw) — one API key for Claude, GPT, Gemini, DeepSeek and 400+ other models, paid in rubles.

The package ships two nodes:

- **Hubris** — a regular node with text, image, audio, video, embedding and account operations. Can be used as a tool by AI Agents.
- **Hubris Chat Model** — a sub-node that plugs any text model from the Hubris catalog into the AI Agent, chains and other LangChain-style nodes.

Documentation in Russian: https://hubris.pw/docs/integrations/n8n

## Installation

**n8n Cloud and verified community nodes:** open the nodes panel, search for "Hubris" and click Install.

**Self-hosted n8n:** go to *Settings → Community Nodes → Install*, enter `n8n-nodes-hubris` and confirm. To let AI Agents use the Hubris node as a tool on self-hosted instances, start n8n with `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

Requirements: n8n 1.100 or newer for the Hubris node; the Hubris Chat Model sub-node needs n8n 2.20 or newer (it relies on `@n8n/ai-node-sdk`, which ships with n8n). On older instances the sub-node reports this when used; the built-in OpenAI Chat Model node with an OpenAI credential pointing at `https://api.hubris.pw/v1` is the alternative.

## Credentials

Create a **Hubris API** credential:

| Field | Value |
| --- | --- |
| API Key | an inference key from https://hubris.pw/keys (starts with `sk-gw-`) |
| Base URL | `https://api.hubris.pw/v1` (change only for a proxy or staging) |

The credential test calls `GET /v1/key`, so a wrong or disabled key is reported right away.

## Operations

| Resource | Operation | What it does |
| --- | --- | --- |
| Text | Chat | `POST /chat/completions`. Simple prompt or full messages array, vision input from a binary field, JSON mode / JSON Schema, reasoning effort, tools. |
| Text | Response | `POST /responses`. Plain text or input items, instructions, JSON Schema output. |
| Embedding | Embed | `POST /embeddings`. One text or a JSON array batch; one item per vector. |
| Image | Generate | `POST /images/generations`. Returns each picture as a binary field (`data` by default). |
| Audio | Transcribe | `POST /audio/transcriptions`. Reads an audio file from a binary field (wav, mp3, flac, m4a, ogg, webm, aac). |
| Audio | Generate Speech | `POST /audio/speech`. Returns an MP3 or PCM file in a binary field. |
| Video | Generate | `POST /videos`, then polls `GET /videos/{id}` and downloads the MP4 when ready. Turn off *Wait for Completion* to get only the job ID. |
| Video | Get | Checks a job by ID and downloads the result. Videos are stored for 72 hours. |
| Account | Get Key Info | `GET /key`: spending limit, usage in the current period, balance. |

Every response that carries Hubris' `usage.cost` (kopecks) also gets a `cost_rub` field with the same amount in rubles. Image generation and speech responses carry no cost field; check the [usage log](https://hubris.pw/logs) for those.

Models are picked from the live catalog (`GET /models`), filtered by the modality of the operation. Any model ID can also be given as an expression.

## Hubris Chat Model

Add **Hubris Chat Model** to an AI Agent, Basic LLM Chain or any node with a *Model* input, pick a model from the catalog and connect the credential. Options cover temperature, top-p, penalties, max tokens, reasoning effort, timeout and retries. Temperature and top-p are sent only when set explicitly: Claude 5 models reject them.

For vector stores use the built-in **Embeddings OpenAI** sub-node with an *OpenAI* credential pointing at `https://api.hubris.pw/v1` and your Hubris key.

## Example workflow

Generate an article and a cover image, then post both to your CMS:

1. **Hubris → Text → Chat** — model `anthropic/claude-sonnet-5`, prompt `Write a 300-word article about {{ $json.topic }}`.
2. **Hubris → Text → Chat** — model `openai/gpt-4o-mini`, Response Format *JSON Schema* with `{ "type": "object", "properties": { "prompt": { "type": "string" } }, "required": ["prompt"] }`, prompt `Describe a cover image for this article: {{ $json.text }}`.
3. **Hubris → Image → Generate** — model `google/gemini-2.5-flash-image`, prompt `{{ $json.json.prompt }}`.
4. Your CMS node — text from step 1, image from the `data` binary field of step 3.

## Errors

API errors keep the HTTP status and Hubris' message, so `402 Insufficient balance`, `429 daily_limit_exceeded` and `401 invalid_api_key` are visible in the execution log and can be handled with *Continue On Fail*.

## Development

```bash
npm install
npm run lint
npm run build
npm test
npm run dev   # starts a local n8n with the package loaded
```

Releases are published from GitHub Actions with npm provenance (`npm run release`).

## License

[MIT](LICENSE.md)
