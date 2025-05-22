import React from 'react';
import { Button, Box, FormHelperText } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export interface FileUploaderProps {
	disabled?: boolean;
	fileName?: string;
	onFileChange: (data: string, file: File) => void;
	error?: boolean;
	helperText?: string;
}

export default function FileUploader({
  	disabled = false,
	fileName,
	onFileChange,
	error = false,
	helperText
}: FileUploaderProps) {
	const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			onFileChange(text, f);
		};
		reader.readAsText(f);
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
			<Button
				variant="contained"
				component="label"
				disabled={disabled}
				startIcon={<CloudUploadIcon />}
				sx={{ textTransform: 'none', minWidth: 180 }}
			>
				{fileName || 'Select File'}
				<input
					hidden
					type="file"
					accept=".xyz"
					onChange={handleChange}
				/>
			</Button>
			{helperText && (
				<FormHelperText error sx={{ mt: 1, ml: 0 }}>
					{helperText}
				</FormHelperText>
			)}
		</Box>
	);
}
