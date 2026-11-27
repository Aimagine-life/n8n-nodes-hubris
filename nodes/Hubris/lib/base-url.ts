/** Default Hubris API endpoint since 0.2.0. */
export const BASE_URL_CURRENT = 'https://api.hubris.pro/v1';
/** Previous endpoint, the default of credentials saved before 0.2.0. It keeps working. */
export const BASE_URL_LEGACY = 'https://api.hubris.pw/v1';
/** Dropdown value that makes the endpoint come from the `customBaseUrl` field. */
export const BASE_URL_CUSTOM = 'custom';

export function trimBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

/**
 * API endpoint from the `hubrisApi` credentials. Before 0.2.0 `baseUrl` was a free-form
 * string, so any value other than `custom` is used as the endpoint itself: saved proxy
 * and staging URLs keep working without re-saving the credentials.
 */
export function resolveBaseUrl(credentials: {
	baseUrl?: unknown;
	customBaseUrl?: unknown;
}): string {
	const selected = typeof credentials.baseUrl === 'string' ? credentials.baseUrl.trim() : '';
	const url =
		selected === BASE_URL_CUSTOM
			? typeof credentials.customBaseUrl === 'string'
				? credentials.customBaseUrl.trim()
				: ''
			: selected;
	return trimBaseUrl(url || BASE_URL_CURRENT);
}
