import React, { useEffect, useRef } from "react";
import { Paper, Typography, Divider, Box, Skeleton, SxProps, Theme } from "@mui/material";
import { blue, blueGrey, grey } from "@mui/material/colors";
import { Atom } from "lucide-react";
import { BorderTopRounded } from "@mui/icons-material";

// Extend the Window interface to include the $3Dmol global
declare global {
	interface Window {
		$3Dmol: any;
	}
}

/**
 * Props for the MolmakerMoleculePreview
 */
interface MolmakerMoleculePreviewProp {
	data?: string;
	format: string;
	source?: "upload" | "library";
	title?: string;
	maxHeight?: number;
	sx?: SxProps<Theme>;
	submitConfirmed?: boolean;
	setStructureImageData?: (data: string) => void;
}

/**
 * Renders a reusable molecule preview panel
 *
 * The component uses 3Dmol.js to render molecular structure data inside a
 * browser canvas.
 * When `submitConfirmed` changes to true, it captures the rendered canvas
 * as a PNG data URL and passes it back to the parent through
 * `setStructureImageData`.
 *
 * Props:
 * - data: raw molecular structure data to render, such as XYZ file contents
 * - format: molecular  file format passed to 3Dmol.js, such as "xyz"
 * - source: indicates where the molecule data comes from.
 *           Used to customize the empty-state message
 * - title: title displayed at the top of the preview panel
 * - maxHeight: optional maximum height for the preview container
 * - sx: optional MUI style overrides for the root Paper component
 * - submitConfirmed: when true, captures the current molecule preview image.
 * - setStructureImageData: optional callback used to send the captured PNG preview
 *                          to the parent component
 */
const MolmakerMoleculePreview: React.FC<MolmakerMoleculePreviewProp> = ({
	data = "",
	format,
	source = "upload",
	title = "Structure Preview",
	maxHeight,
	sx = {},
	submitConfirmed,
	setStructureImageData,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (submitConfirmed) {
			const element = viewerRef.current;
			const canvas = element?.querySelector("canvas");
			const structureImageData = canvas?.toDataURL("image/png");
			if (setStructureImageData && structureImageData) {
				setStructureImageData(structureImageData);
			}
		}
	}, [submitConfirmed]);

	useEffect(() => {
		if (!data || !window.$3Dmol) return;
		const element = viewerRef.current;
		if (!element) return;
		element.innerHTML = "";
		const viewer = window.$3Dmol.createViewer(element, { backgroundColor: "white" });
		viewer.addModel(data, format);
		viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
		viewer.zoomTo();
		viewer.resize();
		viewer.zoomTo();
		viewer.render();
	}, [data, format]);

	return (
		<Paper
			elevation={3}
			sx={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				borderRadius: 2,
				bgcolor: grey[50],
				...(maxHeight ? { maxHeight } : {}),
				...sx,
			}}
		>
			<Typography
				variant="h6"
				color={grey[800]}
				sx={{
					p: 2,
					borderTopLeftRadius: 5,
					borderTopRightRadius: 5,
					display: "flex",
					alignItems: "center",
					fontWeight: "bold",
					fontSize: "1.1rem",
				}}
			>
				<Atom size={24} style={{ marginRight: 10, color: blue[600] }} />
				{title}
			</Typography>
			<Box
				sx={{
					flex: 1,
					position: "relative",
					borderRadius: 2,
				}}
			>
				{data ? (
					<Box ref={viewerRef} sx={{ width: "100%", height: "100%", boxSizing: "border-box" }} />
				) : (
					<Box display="flex" justifyContent="center" alignItems="center" height="100%">
						<Skeleton
							variant="rectangular"
							width="100%"
							height="100%"
							sx={{ borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }}
						/>
						<Typography variant="body2" color="text.secondary" sx={{ position: "absolute" }}>
							{source === "upload" ? "Upload a file to preview" : "Select a molecule to preview"}
						</Typography>
					</Box>
				)}
			</Box>
		</Paper>
	);
};

export default MolmakerMoleculePreview;
