interface Structure {
    structure_id: string;
    user_sub: string;
    name: string;
    notes?: string;
    location: string;
    uploaded_at: string;
    tags: string[];
    imageS3URL?: string;
}

export default Structure;
