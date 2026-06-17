import Job from "./Job";

interface Filter {
    column: keyof Job;
    value: string;
    extent: 'contains' | 'equals' | 'startsWith';
}

export default Filter;