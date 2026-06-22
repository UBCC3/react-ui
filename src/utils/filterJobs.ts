import { reverseMapping } from ".";
import { calculationTypes, columnKinds } from "../constants";
import { Filter, Job } from "../types";

const matchesDateFilter = (job: Job, filter: Filter): boolean => {
    const cellValue = String(job[filter.column] ?? '');
    if (!cellValue) {
        return false;
    }

    const cellTime = new Date(cellValue).getTime();
    const filterTime = new Date(filter.value).getTime();

    if (filter.extent === 'before') {
        return cellTime < filterTime;
    } else if (filter.extent === 'after') {
        return cellTime > filterTime;
    } else if (filter.extent === 'between') {
        if (!filter.value2) {
            return cellTime > filterTime;
        }
        const filterTime2 = new Date(filter.value2).getTime();
        const rangeStart = Math.min(filterTime, filterTime2);
        const rangeEnd = Math.max(filterTime, filterTime2);
        return cellTime >= rangeStart && cellTime <= rangeEnd;
    } else {
        console.warn(`Unsupported extent "${filter.extent}" for date column "${filter.column}"`);
        return true;
    }
}

const runtimeToSeconds = (value: string): number => {
    if (!value) {
        return 0;
    }

    if (value.includes(':')) {
        const parts = value.split(':').map(Number);

        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            return hours * 3600 + minutes * 60 + seconds;
        } else if (parts.length === 2) {
            const [minutes, seconds] = parts;
            return minutes * 60 + seconds;
        } else {
            return Number(parts[0]) || 0;
        }
    } else {
        return Number(value) || 0;
    }
}

const matchesRuntimeFilter = (job: Job, filter: Filter): boolean => {
    const cellSeconds = runtimeToSeconds(String(job[filter.column] ?? ''));
    const filterSeconds = Number(filter.value);

    if (Number.isNaN(filterSeconds)) {
        return true;
    }

    if (filter.extent === 'before') {
        return cellSeconds < filterSeconds;
    } else if (filter.extent === 'after') {
        return cellSeconds > filterSeconds;
    } else if (filter.extent === 'between') {
        if (!filter.value2) {
            return cellSeconds > filterSeconds;
        }
        const filterSeconds2 = Number(filter.value2);
        if (Number.isNaN(filterSeconds2)) {
            return cellSeconds > filterSeconds;
        }
        const rangeStart = Math.min(filterSeconds, filterSeconds2);
        const rangeEnd = Math.max(filterSeconds, filterSeconds2);
        return cellSeconds >= rangeStart && cellSeconds <= rangeEnd;
    } else {
        console.warn(`Unsupported extent "${filter.extent}" for runtime column "${filter.column}"`);
        return true;
    }
}

const matchesStringFilter = (job: Job, filter: Filter, reversedCalculationTypes: Record<string, string>): boolean => {
    let jobValue = '';

    if (filter.column === 'structures') {
        jobValue = job.structures.map(s => s.name).join(', ').toLocaleLowerCase();
    } else if (filter.column === 'calculation_type') {
        jobValue = (reversedCalculationTypes[job.calculation_type] ?? job.calculation_type).toLocaleLowerCase();
    } else {
        jobValue = String(job[filter.column] ?? '').toLowerCase();
    }

    const filterValue = filter.value.toLowerCase();

    if (filter.extent === 'contains') {
        if (filter.column === 'tags' || filter.column === 'structures') {
            return jobValue.split(',').some(tag => tag.trim().toLowerCase().includes(filterValue));
        }
        return jobValue.includes(filterValue);
    } else if (filter.extent === 'equals') {
        if (filter.column === 'tags' || filter.column === 'structures') {
            return jobValue.split(',').some(tag => tag.trim().toLowerCase() === filterValue);
        }
        return jobValue === filterValue;
    } else if (filter.extent === 'startsWith') {
        if (filter.column === 'tags' || filter.column === 'structures') {
            return jobValue.split(',').some(tag => tag.trim().toLowerCase().startsWith(filterValue));
        }
    } else {
        console.warn(`Unsupported extent"${filter.extent}" for string column "${filter.column}"`);
        return true;
    }
}

/**
 * Applies all custom filters to the jobs list.
 * Tags and structures are handled specially because they contain multiple values.
 */
export const filterJobs = (jobs: Job[], filters: Filter[]): Job[] => {
    const reversedCalculationTypes = reverseMapping(calculationTypes);
    let filtered = [...jobs];

    for (const filter of filters) {
        if (!filter.value) {
            continue;
        }

        const kind = columnKinds[filter.column] ?? 'string';

        if (kind === 'date') {
            filtered = filtered.filter(job => matchesDateFilter(job, filter));
        } else if (kind === 'runtime') {
            filtered = filtered.filter(job => matchesRuntimeFilter(job, filter));
        } else {
            filtered = filtered.filter(job => matchesStringFilter(job, filter, reversedCalculationTypes));
        }
    }

    return filtered;
}