import React from "react";
import { Typography } from "@mui/material";

/**
 * Renders a chemical formula string with proper subscripts and superscripts.
 * - {...} or (...) → superscript (e.g. charge/oxidation state)
 * - digits → subscript (e.g. atom counts)
 */
export const renderFormula = (formula: string) => {
	if (!formula) {
		return (
			<Typography variant="body2" color="text.secondary">
				No formula
			</Typography>
		);
	}

	// Regex: match {...} or (...) for superscript, or numbers for subscript
	const regex = /\{([^}]+)\}|\(([^)]+)\)|(\d+)/g;
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let i = 0;
	let match;

	while ((match = regex.exec(formula)) !== null) {
		if (match.index > lastIndex) {
			parts.push(formula.slice(lastIndex, match.index));
		}
		if (match[1] !== undefined) {
			parts.push(<sup key={i++}>{match[1]}</sup>);
		} else if (match[2] !== undefined) {
			parts.push(<sup key={i++}>{match[2]}</sup>);
		} else if (match[3] !== undefined) {
			parts.push(<sub key={i++}>{match[3]}</sub>);
		}
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < formula.length) {
		parts.push(formula.slice(lastIndex));
	}
	return <Typography variant="body2">{parts}</Typography>;
};
