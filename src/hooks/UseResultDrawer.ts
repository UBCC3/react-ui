import React, { useState } from 'react';

type AccordionState = Record<string, boolean>;

/**
 * Manages the open/collapsed state of a persistent result drawer along with
 * the expanded/collapsed state of its accordion sections.
 * 
 * Collapsing the drawer force-closes every accordion (mini drawer only shows
 * icons). Opening any accordion while the drawer is collapsed automatically
 * re-expands the drawer. This is the exact toggle/handleAccordionChange
 * pattern that was previously duplicated across EnergyViewer,
 * OptimizationViewer, OrbitalViewer, and VibrationViewer.
 */
export function useResultDrawer<T extends AccordionState>(initialAccordionState: T) {
    const [open, setOpen] = useState(true);
    const [accordionOpen, setAccordionOpen] = useState<T>(initialAccordionState);

    const toggle = () => {
        if (open) {
            setOpen(false);
            const closedState = Object.keys(accordionOpen).reduce((acc, key) => {
                acc[key as keyof T] = false as T[keyof T];
                return acc;
            }, {} as T);
            setAccordionOpen(closedState);
        } else {
            setOpen(true);
        }
    };

    const handleAccordionChange = (panel: keyof T) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setAccordionOpen(prev => ({ ...prev, [panel]: isExpanded }));
        if (isExpanded && !open) setOpen(true); // Open drawer if opening an accordion
    }

    return { open, accordionOpen, toggle, handleAccordionChange };
}