interface GroupRequest {
	request_id: string;
	status: string; // pending | approved | rejected | expired | cancelled
	request_type: string; // invite | join_request | demember_request
	requested_at: string;
	expires_at: string;
	resolved_at: string | null;
	group_id: string | null;
	group_name: string | null;
	// Only present when the viewer is an admin/group-admin for the request's group.
	sender_sub?: string;
	receiver_sub?: string;
	created_by_sub?: string;
	resolved_by_sub?: string;
	sender_name?: string | null;
	receiver_name?: string | null;
	created_by_name?: string | null;
	resolved_by_name?: string | null;
}

export default GroupRequest;
