interface User {
    user_sub: string;
    email: string;
    role: string;
    group?: string;
    group_id?: string;
    member_since?: string;
    job_count?: number;
}

export default User;