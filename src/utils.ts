import { calculationTypes } from "./constants";
import {ComplexNumber, Job} from "./types";
import Filter from "./types/Filter";

export const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


export const formatComplex = (c: ComplexNumber) =>  {
  const { real, imag } = c;

  if (real === 0 && imag === 0) { return "0"; }
  if (imag === 0) { return `${real.toFixed(2)}`; }
  if (real === 0) { return `-${imag.toFixed(2)}`; }

  const sign = imag >= 0 ? "+" : "-";
  return `${real.toFixed(2)} ${sign} ${Math.abs(imag).toFixed(2)}i`;
}

// Reversing the mapping of a dict object
export const reverseMapping = (obj: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

/**
 * Applies all custom filters to the jobs list.
 * 
 * Each filter checks one selected column using one of three matching modes:
 * - contains,
 * - equals,
 * - startsWith.
 * 
 * Tags and structures are handled specially because they contain multiple values.
 */
export const filterJobs = (jobs: Job[], filters: Filter[]): Job[] => {
    const reversedCalculationTypes = reverseMapping(calculationTypes);
    let filtered = [...jobs];

    for (const filter of filters) {
        filtered = filtered.filter(job => {
            let jobValue = '';

            if (filter.column === 'structures') {
                jobValue = job.structures.map(s => s.name).join(', ').toLowerCase();
            } else if (filter.column === 'calculation_type') {
                jobValue = (reversedCalculationTypes[job.calculation_type] ?? job.calculation_type).toLocaleLowerCase();
            } else {
                jobValue = String(job[filter.column] ?? '').toLowerCase();
            }

            const filterValue = filter.value.toLowerCase();

            switch (filter.extent) {
                case 'contains':
                    if (filter.column === 'tags' || filter.column === 'structures') {
                        return jobValue.split(',').some(tag => tag.trim().toLowerCase().includes(filterValue));
                    }
                    return jobValue.includes(filterValue);
                case 'equals':
                    if (filter.column === 'tags' || filter.column === 'structures') {
                        return jobValue.split(',').some(tag => tag.trim().toLowerCase() === filterValue);
                    }
                    return jobValue === filterValue;
                case 'startsWith':
                    if (filter.column === 'tags' || filter.column === 'structures') {
                        return jobValue.split(',').some(tag => tag.trim().toLowerCase().startsWith(filterValue));
                    }
                    return jobValue.startsWith(filterValue)
                default:
                    return true;
            }
        });
    }

    return filtered;
}