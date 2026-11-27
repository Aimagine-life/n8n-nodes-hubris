/** Адрес API Hubris по умолчанию с версии 0.2.0. */
export const BASE_URL_CURRENT = 'https://api.hubris.pro/v1';
/** Прежний адрес: на нём сохранены учётные данные версий до 0.2.0. */
export const BASE_URL_LEGACY = 'https://api.hubris.pw/v1';
/** Значение выпадающего списка, при котором адрес берётся из поля `customBaseUrl`. */
export const BASE_URL_CUSTOM = 'custom';

export function trimBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

/**
 * Адрес API из учётных данных `hubrisApi`. До 0.2.0 `baseUrl` было свободной строкой,
 * поэтому любое значение, кроме `custom`, используется как адрес: сохранённые прокси
 * и стенды продолжают работать без пересохранения.
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
