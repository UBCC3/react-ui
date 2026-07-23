interface Structure {
	structure_id: string;
	user_sub?: string;
	name: string;
	formula: string;
	notes?: string;
	location: string;
	uploaded_at: string;
	tags: string[];
	imageS3URL?: string;
	group_id?: string | null;
	is_public?: boolean;
}

export default Structure;
