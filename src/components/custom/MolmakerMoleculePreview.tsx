import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import { Paper, Typography, Divider, Box, Skeleton, SxProps, Theme } from '@mui/material';
import { blueGrey } from '@mui/material/colors';

// Extend the Window interface to include the $3Dmol global
declare global {
	interface Window {
		$3Dmol: any;
	}
}

interface MolmakerMoleculePreviewProp {
	data?: string;
	format: string;
	source?: 'upload' | 'library';
	title?: string;
	maxHeight?: number;
	sx?: SxProps<Theme>;
}

export interface MolmakerMoleculePreviewRef {
	captureCurrentView: () => string;
}

export async function getStructureImageData(previewRef: React.RefObject<MolmakerMoleculePreviewRef>): Promise<string> {
	for (let i = 0; i < 5; i++) {
		if (previewRef.current) {
			return previewRef.current.captureCurrentView();
		}
		await new Promise((res) => setTimeout(res, 100));
	}
	throw new Error('Failed to get structure image');
}

export const MolmakerMoleculePreview = forwardRef<MolmakerMoleculePreviewRef, MolmakerMoleculePreviewProp>(({
	data = '',
	format,
	source = 'upload',
	title = 'Structure Preview',
	maxHeight,
	sx = {},
}, ref) => {
  	const viewerRef = useRef<HTMLDivElement>(null);
	  
	useImperativeHandle(ref, () => ({
        captureCurrentView: () => {
            const element = viewerRef.current;
            if (!element) return null;

            const canvas = element.querySelector('canvas');
            if (canvas instanceof HTMLCanvasElement) {
                return canvas.toDataURL("image/png");
            }
            return null;
        }
	}))

	useEffect(() => {
		if (!data || !window.$3Dmol) return;
		const element = viewerRef.current;
		if (!element) return;
		element.innerHTML = '';
		const viewer = window.$3Dmol.createViewer(element, { backgroundColor: 'white' });
		viewer.addModel(data, format);
		viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
		viewer.zoomTo();
		viewer.resize();
		viewer.zoomTo();
		viewer.render();

	}, [data, format]);

	return (
		<Paper
			elevation={2}
			sx={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: '100%',
				...(maxHeight ? { maxHeight } : {}),
				...sx
			}}
		>
			<Typography variant="h6" color="text.secondary" sx={{ p: 2, bgcolor: blueGrey[200] }}>
				{title}
			</Typography>
			<Divider />
			<Box
				sx={{
					flex: 1,
					position: 'relative',
					border: '1px solid',
					borderColor: 'grey.300'
				}}
			>
				{data ? (
					<Box
						ref={viewerRef}
						sx={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
					/>
				) : (
					<Box display="flex" justifyContent="center" alignItems="center" height="100%">
						<Skeleton variant="rectangular" width="100%" height="100%" />
						<Typography variant="body2" color="text.secondary" sx={{ position: 'absolute' }}>
							{source === 'upload' ? 'Upload a file to preview' : 'Select a molecule to preview'}
						</Typography>
					</Box>
				)}
			</Box>
		</Paper>
	);
});