import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { resolveBaseUrl } from './base-url';

export type HubrisContext = IExecuteFunctions | ILoadOptionsFunctions;

export interface HubrisRequestOptions {
	method: IHttpRequestMethods;
	/** Path relative to the base URL, e.g. '/chat/completions' */
	path: string;
	body?: IDataObject;
	qs?: IDataObject;
	timeout?: number;
}

const USER_AGENT = 'n8n-nodes-hubris';
/**
 * Имя приложения для колонки «Приложение» в логах Hubris. `User-Agent` до шлюза
 * доезжает не всегда (HTTP-клиенты по пути его переписывают), `X-Title` —
 * доезжает: это конвенция OpenAI-совместимых шлюзов.
 */
const CLIENT_TITLE = 'n8n';
const DEFAULT_TIMEOUT_MS = 300_000;

function isApiErrorBody(
	body: unknown,
): body is { error: { message: string; code?: string; type?: string } } {
	return (
		typeof body === 'object' &&
		body !== null &&
		'error' in body &&
		typeof (body as { error?: { message?: unknown } }).error?.message === 'string'
	);
}

/** Convert a Hubris error response `{ error: { message, type, code } }` into a NodeApiError. */
export function toApiError(node: INode, statusCode: number, body: unknown): NodeApiError {
	const httpCode = String(statusCode);
	if (isApiErrorBody(body)) {
		return new NodeApiError(node, body as JsonObject, {
			message: body.error.message,
			description: body.error.code ? `Error code: ${body.error.code}` : undefined,
			httpCode,
		});
	}
	return new NodeApiError(node, { statusCode, body: String(body) } as JsonObject, {
		message: `Hubris API request failed (HTTP ${statusCode})`,
		httpCode,
	});
}

async function baseUrlOf(ctx: HubrisContext): Promise<string> {
	const credentials = await ctx.getCredentials('hubrisApi');
	return resolveBaseUrl(credentials);
}

interface FullResponse<T> {
	statusCode: number;
	body: T;
	headers: Record<string, string | undefined>;
}

export async function hubrisRequest<T = IDataObject>(
	ctx: HubrisContext,
	options: HubrisRequestOptions,
): Promise<T> {
	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${await baseUrlOf(ctx)}${options.path}`,
		headers: { 'User-Agent': USER_AGENT, 'X-Title': CLIENT_TITLE, Accept: 'application/json' },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
	};
	if (options.body !== undefined) requestOptions.body = options.body;
	if (options.qs !== undefined) requestOptions.qs = options.qs;

	const response = (await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		'hubrisApi',
		requestOptions,
	)) as FullResponse<unknown>;
	if (response.statusCode >= 400) {
		throw toApiError(ctx.getNode(), response.statusCode, response.body);
	}
	return response.body as T;
}

export async function hubrisRequestBinary(
	ctx: HubrisContext,
	options: HubrisRequestOptions,
): Promise<{ buffer: Buffer; contentType: string }> {
	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${await baseUrlOf(ctx)}${options.path}`,
		headers: { 'User-Agent': USER_AGENT, 'X-Title': CLIENT_TITLE },
		json: options.body !== undefined,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
	};
	if (options.body !== undefined) requestOptions.body = options.body;
	if (options.qs !== undefined) requestOptions.qs = options.qs;

	const response = (await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		'hubrisApi',
		requestOptions,
	)) as FullResponse<Buffer | ArrayBuffer>;
	const buffer = Buffer.from(response.body as ArrayBuffer);
	if (response.statusCode >= 400) {
		let parsed: unknown = buffer.toString('utf8');
		try {
			parsed = JSON.parse(parsed as string);
		} catch {
			// keep the raw text
		}
		throw toApiError(ctx.getNode(), response.statusCode, parsed);
	}
	return {
		buffer,
		contentType: response.headers['content-type'] ?? 'application/octet-stream',
	};
}
