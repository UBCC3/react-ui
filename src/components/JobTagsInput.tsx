import { Autocomplete, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { hasUncommittedTag } from "../utils";

interface JobTagsInputProps {
	value: string[];
	inputValue: string;
	options: string[];
	onChange: (tags: string[]) => void;
	onInputChange: (value: string) => void;
	showUncommittedWarning: boolean;
	disablePortal?: boolean;
	sx?: SxProps<Theme>;
}

/** A free-text job tag input that keeps its keyboard instruction visible. */
export default function JobTagsInput({
	value,
	inputValue,
	options,
	onChange,
	onInputChange,
	showUncommittedWarning,
	disablePortal = false,
	sx,
}: JobTagsInputProps) {
	return (
		<Autocomplete
			multiple
			freeSolo
			disablePortal={disablePortal}
			options={options}
			value={value}
			inputValue={inputValue}
			onInputChange={(_, nextInputValue) => onInputChange(nextInputValue)}
			onChange={(_, newValue) => {
				onChange(newValue.map((tag) => tag.trim()).filter(Boolean));
				onInputChange("");
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					variant="outlined"
					label="Tags"
					error={showUncommittedWarning}
					helperText={
						showUncommittedWarning && hasUncommittedTag(inputValue)
							? `Press Enter to add “${inputValue.trim()}” before continuing.`
							: "Press Enter to add each tag."
					}
				/>
			)}
			sx={sx}
		/>
	);
}
