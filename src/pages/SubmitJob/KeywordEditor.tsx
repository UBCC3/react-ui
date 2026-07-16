import { useState } from "react";
import { MolmakerDropdown, MolmakerTextField } from "../../components/custom";
import { Button, Grid, Box, IconButton, TextField } from "@mui/material";
import { Add, DeleteOutlineOutlined } from "@mui/icons-material";
import * as React from "react";

// Represents one custom calculation keyword entered by the user.
export interface Keyword {
	key: string;
	type: string;
	value: any;
}

// Available value types that the user can choose for each keyword.
const KEYWORD_VALUE_TYPE = [
	{ label: "String", value: "string" },
	{ label: "Integer", value: "int" },
	{ label: "Float", value: "float" },
	{ label: "List", value: "list" },
	{ label: "Boolean", value: "bool" },
];

// Default blank row used when adding a new keyword entry.
const keywordBlankRow: Keyword = { key: "", type: "string", value: "" };

/**
 * Renders an editable list of calculation keywords.
 *
 * Users can:
 * - add keyword rows,
 * - choose the value type for each keyword,
 * - enter the keyword value,
 * - delete keyword rows,
 *
 * The parent component receives only valid rows where the keyword key is not empty.
 */
export function KeywordEditor({ maxEntries = 20, onChange }) {
	// Stores all keyword rows currently shown in the editor.
	const [keywords, setKeywords] = useState([]);

	/**
	 * Renders the correct input field based on the selected keyword value type.
	 */
	const renderValueField = (row, idx) => {
		const commonProps = {
			fullWidth: true,
			value: row.value,
			onChange: (e) => updateKeywordRow(idx, "value", e.target.value),
		};

		switch (row.type) {
			case "string":
				return <MolmakerTextField {...commonProps} label="String" />;

			case "int":
				return (
					<MolmakerTextField
						{...commonProps}
						label="Integer"
						type="number"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							const val = e.target.value;
							if (/^-?\d*$/.test(val)) {
								updateKeywordRow(idx, "value", parseInt(val));
							}
						}}
					/>
				);

			case "float":
				return <MolmakerTextField {...commonProps} label="Float" type="number" />;

			case "list":
				return (
					<TextField
						{...commonProps}
						label="List"
						multiline={true}
						placeholder="[1, 2, 3]"
						minRows={1}
						maxRows={4}
					/>
				);

			case "bool":
				return (
					<MolmakerDropdown
						{...commonProps}
						label="Boolean"
						options={[
							{ label: "True", value: "true" },
							{ label: "False", value: "false" },
						]}
					/>
				);
		}
	};

	/**
	 * Updates one field in a specific keyword row
	 *
	 * After updating local state, the parent onChange callback is called with
	 * only rows that have a non-emmpty keyword key.
	 */
	const updateKeywordRow = (rowIndexToUpdate, field, newVal) => {
		const updatedKeywords = keywords.map((r, i) =>
			i === rowIndexToUpdate ? { ...r, [field]: newVal } : r,
		);
		setKeywords(updatedKeywords);
		onChange?.(updatedKeywords.filter((r) => r.key.trim() !== ""));
	};

	/**
	 * Adds a new blank keyword row if the maximum number of entries
	 * has not been reached.
	 */
	const addKeywordRow = () => {
		if (keywords.length < maxEntries) {
			setKeywords([...keywords, keywordBlankRow]);
		}
	};

	/**
	 * Deletes a keyword row by index.
	 *
	 * After deleting, the parent is updated with the remaining valid rows.
	 */
	const deleteKeywordRow = (idx: number) => {
		const nextRows = keywords.filter((_, i) => i !== idx);
		setKeywords(nextRows.length ? nextRows : []);
		onChange?.(nextRows.filter((r) => r.key.trim() !== ""));
	};

	return (
		<Box>
			{keywords.map((keywordRow, idx) => (
				<Grid
					container
					spacing={2}
					sx={{ my: 2 }}
					display="flex"
					alignItems="center"
					justifyContent="center"
					key={idx}
				>
					<Grid size={{ xs: 8, md: 3 }}>
						<MolmakerTextField
							fullWidth={true}
							label="Keyword"
							type="string"
							value={keywordRow.key}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateKeywordRow(idx, "key", e.target.value);
							}}
						/>
					</Grid>
					<Grid size={{ xs: 4, md: 3 }}>
						<MolmakerDropdown
							fullWidth
							label={"Type"}
							value={keywordRow.type}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateKeywordRow(idx, "type", e.target.value);
							}}
							options={KEYWORD_VALUE_TYPE.map((availableType) => ({
								label: availableType.label,
								value: availableType.value,
							}))}
						/>
					</Grid>
					<Grid size={{ xs: 11, md: 5 }}>{renderValueField(keywordRow, idx)}</Grid>
					<Grid size={1}>
						<IconButton aria-label="delete row" color="error" onClick={() => deleteKeywordRow(idx)}>
							<DeleteOutlineOutlined fontSize="small" />
						</IconButton>
					</Grid>
				</Grid>
			))}
			<Grid container justifyContent="flex-end">
				<Button
					variant="outlined"
					startIcon={<Add />}
					disabled={keywords.length >= maxEntries}
					onClick={addKeywordRow}
					sx={{
						textTransform: "none",
					}}
				>
					Add keyword
				</Button>
			</Grid>
		</Box>
	);
}
