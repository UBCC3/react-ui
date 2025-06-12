interface Structure {
    structure_id: string;
    user_sub: string;
    name: string;
    notes?: string;
    location: string;
    uploaded_at: string;
    tags: string[];
    imageURL?: string;
}

export default Structure;
