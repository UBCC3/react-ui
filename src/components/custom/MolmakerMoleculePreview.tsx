import React, { useEffect, useMemo } from "react";
import { Paper, Typography, Box, Skeleton, SxProps, Theme } from "@mui/material";
import { blue, grey } from "@mui/material/colors";
import { Atom } from "lucide-react";
import { useJsmolViewer } from "../../hooks/UseJsmolViewer";
import type { MeasureKind } from "../../utils";

/** Atoms a complete measurement needs, so partial picks don't draw a wrong one. */
const EXPECTED_ATOMS: Record<MeasureKind, number> = { bond: 2, angle: 3, dihedral: 4 };

interface MolmakerMoleculePreviewProp {
	data?: string;
	format: string;
	source?: "upload" | "library";
	title?: string;
	maxHeight?: number;
	sx?: SxProps<Theme>;
	submitConfirmed?: boolean;
	showAtomNumbers?: boolean;
	/** 1-based atom numbers, in scan order. */
	highlightAtoms?: number[];
	highlightKind?: MeasureKind;
	/** JSmol applets are keyed globally; override if two previews share a page. */
	viewerObjId?: string;
	setStructureImageData?: (data: string) => void;
}

const MolmakerMoleculePreview: React.FC<MolmakerMoleculePreviewProp> = ({
	data = "",
	source = "upload",
	title = "Structure Preview",
	maxHeight,
	sx = {},
	submitConfirmed,
	showAtomNumbers = false,
	highlightAtoms = [],
	highlightKind = "bond",
	viewerObjId = "structurePreviewApplet",
	setStructureImageData,
}) => {
	// Inline DATA block instead of a URL, since uploads only exist in memory.
	// Changing molecule changes loadScript, which rebuilds the applet — the same
	// path the result viewers take, and a view reset here is what you want anyway.
	const loadScript = useMemo(
		() => (data ? `load DATA "preview"\n${data}\nend "preview";` : ""),
		[data],
	);

	const { viewerRef, viewerObj } = useJsmolViewer({
		viewerObjId,
		src: "",
		loadScript,
		onReadyScript: `zoom 50; connect auto; set measurementUnits angstroms; set measurementLabels on; set antialiasDisplay on;`,
		skip: !data,
		cleanupOnChange: true,
	});

	// Arrays are new objects each render; key the effects on their contents.
	const highlightKey = highlightAtoms.join(",");

	useEffect(() => {
		if (submitConfirmed) {
			const canvas = viewerRef.current?.querySelector("canvas");
			const structureImageData = canvas?.toDataURL("image/png");
			if (setStructureImageData && structureImageData) {
				setStructureImageData(structureImageData);
			}
		}
	}, [submitConfirmed]);

	// Mark the scanned coordinate, matching ScanViewer on the result page.
	useEffect(() => {
		if (!viewerObj) return;

		if (highlightAtoms.length === 0) {
			window.Jmol.script(viewerObj, "measures delete; select none; halos off;");
			return;
		}

		const measureTargets = highlightAtoms.map((a) => `(atomno=${a})`).join(" ");
		const atomSelection = highlightAtoms.map((a) => `atomno=${a}`).join(" or ");
		const complete = highlightAtoms.length === EXPECTED_ATOMS[highlightKind];

		window.Jmol.script(
			viewerObj,
			`
				measures delete;
				select all; halos off;
				${complete ? `measure ${measureTargets};` : ""}
				select ${atomSelection};
				color halos orange;
				halos on;
				select none;
			`,
		);
	}, [viewerObj, highlightKey, highlightKind]);

	useEffect(() => {
		if (!viewerObj) return;
		window.Jmol.script(
			viewerObj,
			`select all; ${showAtomNumbers ? "label %[atomno]; color labels black; font label 14;" : "label off;"} select none;`,
		);
	}, [viewerObj, showAtomNumbers]);

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
			<Box sx={{ position: "relative", height: maxHeight ?? 400, borderRadius: 2 }}>
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
