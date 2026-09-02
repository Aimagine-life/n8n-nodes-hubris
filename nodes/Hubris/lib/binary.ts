/** Detect the image type of a generated picture by its magic bytes. Falls back to PNG. */
export function detectImageMime(buffer: Buffer): { mime: string; ext: string } {
	if (
		buffer.length >= 4 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	) {
		return { mime: 'image/png', ext: 'png' };
	}
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return { mime: 'image/jpeg', ext: 'jpg' };
	}
	if (
		buffer.length >= 12 &&
		buffer.toString('latin1', 0, 4) === 'RIFF' &&
		buffer.toString('latin1', 8, 12) === 'WEBP'
	) {
		return { mime: 'image/webp', ext: 'webp' };
	}
	return { mime: 'image/png', ext: 'png' };
}

const AUDIO_FORMATS = new Set(['wav', 'mp3', 'flac', 'm4a', 'ogg', 'webm', 'aac']);
const MIME_TO_FORMAT: Record<string, string> = {
	'audio/mpeg': 'mp3',
	'audio/mp3': 'mp3',
	'audio/wav': 'wav',
	'audio/x-wav': 'wav',
	'audio/wave': 'wav',
	'audio/flac': 'flac',
	'audio/x-flac': 'flac',
	'audio/mp4': 'm4a',
	'audio/x-m4a': 'm4a',
	'audio/ogg': 'ogg',
	'audio/webm': 'webm',
	'audio/aac': 'aac',
};

/** Audio format accepted by /audio/transcriptions, derived from the file name or MIME type. */
export function audioFormatFromBinary(binary: {
	fileName?: string;
	mimeType?: string;
}): string | undefined {
	const ext = binary.fileName?.split('.').pop()?.toLowerCase();
	if (ext && AUDIO_FORMATS.has(ext)) return ext;
	const mime = binary.mimeType?.split(';')[0].trim().toLowerCase();
	if (mime && MIME_TO_FORMAT[mime]) return MIME_TO_FORMAT[mime];
	return undefined;
}

export function dataUrlFromBinary(buffer: Buffer, mimeType: string): string {
	return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
