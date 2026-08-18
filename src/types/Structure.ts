/**
 * Base64 thumbnail returned with a single structure.
 *
 * `media_type` is whatever Content-Type the uploader sent and the backend does
 * not validate it, so never interpolate it into a data URL unclamped. Use
 * structureThumbnailDataUrl, which restricts it to image types.
 */
export interface StructureThumbnail {
	media_type: string;
	base64: string;
}

interface Structure {
	structure_id: string;
	user_sub?: string;
	name: string;
	formula: string;
	notes?: string;
	uploaded_at: string;
	tags: string[];
	group_id?: string | null;
	is_public?: boolean;
	/** Structure file text. Only returned by GET /structures/{id}. */
	content?: string;
	/** Only returned by GET /structures/{id}, never by the list endpoint. */
	thumbnail?: StructureThumbnail;
}

export default Structure;
