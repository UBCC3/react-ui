import Job from "./Job";

export type FilterExtent =
    | 'contains'
    | 'equals'
    | 'startsWith'
    | 'before'
    | 'after'
    | 'between';

interface Filter {
    column: keyof Job;
    value: string;
    value2?: string;
    extent: FilterExtent;
}

export default Filter;