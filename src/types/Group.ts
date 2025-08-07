import User from "./User";

interface Group {
	users: User[];
    group_id: string;
    name: string;
}

export default Group;