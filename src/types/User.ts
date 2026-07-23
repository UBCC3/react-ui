interface User {
	user_sub: string;
	email: string;
	role: string;
	group?: string;
	group_id?: string;
	role_or_group_updated_at?: string;
	job_count?: number;
}

export default User;
