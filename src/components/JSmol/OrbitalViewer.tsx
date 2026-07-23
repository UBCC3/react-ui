import React, { useEffect, useState } from "react";
import {
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	GlobalStyles,
} from "@mui/material";
import { Job, JobResult, Orbital } from "../../types";
import { grey, blueGrey } from "@mui/material/colors";
import OrbitalProperty from "./OrbitalProperty";
import {
	AdjustOutlined,
	DataObjectOutlined,
	ContrastOutlined,
	CalculateOutlined,
} from "@mui/icons-material";
import MolmakerLoading from "../custom/MolmakerLoading";
import CalculatedQuantities from "./CalculatedQuantities";
import PartialCharge from "./PartialCharge";
import { useResultDrawer } from "../../hooks/UseResultDrawer";
import { useJsmolViewer } from "../../hooks/UseJsmolViewer";
import { useJobResult } from "../../hooks/UseJobResult";
import { ResultDrawer } from "../results/ResultDrawer";
import { ResultDrawerSection } from "../results/ResultDrawerSection";
import AddStructureToLibrary from "./AddStructureToLibrary";

/**
 * Props for the OrbitalViewer component
 */
interface OrbitalViewerProp {
	job: Job;
	jobResultFiles: JobResult;
	viewerObjId: string;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Displays the molecule orbital result viewer
 *
 * Loads molecular orbital result files into JSmol, extracts orbital
 * information for the orbital table, displays calculated quantities and
 * partial charges, and allows users to save the currently viewed structure
 * to their molecule library
 */
const OrbitalViewer: React.FC<OrbitalViewerProp> = ({
	job,
	jobResultFiles,
	viewerObjId,
	setError,
}) => {
	const resultURL = jobResultFiles.urls["result"];
	const { result, loading } = useJobResult(resultURL, "molecular orbitals", setError);

	const moldenFile = jobResultFiles.urls["molden"];
	const espFile = jobResultFiles.urls["esp"];

	const { viewerRef, viewerObj } = useJsmolViewer({
		viewerObjId,
		src: moldenFile,
		loadScript: `load FILES "${moldenFile}" "${espFile}";`,
		onReadyScript: `reset; zoom 50;`,
		skip: loading,
	});

	const { open, accordionOpen, toggle, handleAccordionChange } = useResultDrawer({
		orbitals: false,
		properties: false,
		quantities: false,
		charges: false,
	});

	// orbital table state
	const [orbitals, setOrbitals] = useState<Orbital[]>([]);
	const rowsPerPage = 5;
	const [page, setPage] = useState(0);
	const [selectedOrbital, setSelectedOrbital] = useState<Orbital | null>(null);

	// orbital display options
	const [meshOrFill, setMeshOrFill] = useState<"fill" | "mesh">("fill");
	const [showIsosurface, setShowIsosurface] = useState(true);

	// Render the selected molecular orbital whenever the orbital or display mode changes
	useEffect(() => {
		if (!viewerObj || orbitals.length === 0 || selectedOrbital === null) return;

		const displayOption: string = meshOrFill === "fill" ? "NOMESH FILL" : "NOFILL MESH";
		const script = `
			frame 1;
			mo delete all;
			label OFF;
			isosurface delete;
			mo ${selectedOrbital.index};
			mo ${displayOption};
			mo titleFormat " ";
			${showIsosurface ? "mo on; isosurface on;" : "mo off; isosurface off;"}
		`;
		window.Jmol.script(viewerObj, script);
	}, [orbitals, selectedOrbital, viewerObj, meshOrFill]);

	// Extract molecular orbital metadata from the loaded JSmol model
	useEffect(() => {
		if (!viewerObj) return;

		const mos = window.Jmol.getPropertyAsArray(
			viewerObj,
			"auxiliaryInfo.models[1].moData.mos", // models[1] map to loaded file 1
		);
		const orbitalsArray: Orbital[] = mos.map((mo: any): Orbital => ({
			index: mo.index,
			energy: mo.energy,
			occupancy: mo.occupancy,
			spin: mo.spin,
			symmetry: mo.symmetry,
			type: mo.type,
		}));
		setOrbitals(orbitalsArray);
	}, [viewerObj]);

	const handleChangePage = (_: any, newPage: number) => setPage(newPage);

	if (loading) {
		return <MolmakerLoading />;
	}

	return (
		<>
			<GlobalStyles
				styles={{
					".MuiDialog-root, .MuiDialog-container, .MuiDialog-paper, .MuiBackdrop-root": {
						zIndex: 9999,
					},
				}}
			/>
			<Grid container spacing={2} sx={{ width: "100%" }}>
				<Grid sx={{ width: "100%" }}>
					<AddStructureToLibrary viewerObj={viewerObj} viewerRef={viewerRef} />
				</Grid>
				<Grid
					sx={{ display: "flex", flexDirection: "column", flex: "1 0 auto", position: "relative" }}
				>
					<Paper
						ref={viewerRef}
						sx={{
							width: "100%",
							aspectRatio: "1 / 1",
							height: "auto",
							boxSizing: "border-box",
							borderRadius: 2,
						}}
						elevation={3}
					/>
				</Grid>
				<ResultDrawer open={open} onToggle={toggle}>
					<ResultDrawerSection
						open={open}
						expanded={accordionOpen.orbitals}
						onChange={handleAccordionChange("orbitals")}
						icon={<AdjustOutlined />}
						label="Orbitals"
						ariaId="panel1"
					>
						<TableContainer sx={{ flex: 1 }}>
							<Table>
								<TableHead>
									<TableRow sx={{ bgcolor: grey[200] }}>
										<TableCell>Sym</TableCell>
										<TableCell>Energy</TableCell>
										<TableCell>Occ</TableCell>
										<TableCell>Spin</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{orbitals.slice(page * 5, page * 5 + 5).map((orbital) => (
										<TableRow
											key={orbital.index}
											onClick={() => setSelectedOrbital(orbital)}
											sx={{
												cursor: "pointer",
												bgcolor:
													selectedOrbital && orbital === selectedOrbital ? blueGrey[100] : grey[50],
												"&:hover": { backgroundColor: blueGrey[50] },
											}}
										>
											<TableCell>{orbital.symmetry}</TableCell>
											<TableCell>{orbital.energy.toFixed(6)}</TableCell>
											<TableCell>{orbital.occupancy}</TableCell>
											<TableCell>{orbital.spin}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							count={orbitals.length}
							page={page}
							onPageChange={handleChangePage}
							rowsPerPage={rowsPerPage}
							rowsPerPageOptions={[]}
							showFirstButton
							showLastButton
						/>
					</ResultDrawerSection>
					<ResultDrawerSection
						open={open}
						expanded={accordionOpen.properties}
						onChange={handleAccordionChange("properties")}
						icon={<DataObjectOutlined />}
						label="Orbital Properties"
						ariaId="panel2"
						detailsSx={{ borderBottom: "1px solid", borderColor: grey[300] }}
					>
						<OrbitalProperty
							viewerObj={viewerObj}
							selectedOrbital={selectedOrbital}
							meshOrFill={meshOrFill}
							setMeshOrFill={setMeshOrFill}
							showIsosurface={showIsosurface}
							setShowIsosurface={setShowIsosurface}
						/>
					</ResultDrawerSection>
					<ResultDrawerSection
						open={open}
						expanded={accordionOpen.quantities}
						onChange={handleAccordionChange("quantities")}
						icon={<CalculateOutlined />}
						label="Calculated Quantities"
						ariaId="panel3"
					>
						{result && <CalculatedQuantities job={job} result={result} />}
					</ResultDrawerSection>
					<ResultDrawerSection
						open={open}
						expanded={accordionOpen.charges}
						onChange={handleAccordionChange("charges")}
						icon={<ContrastOutlined />}
						label="Partial Charges"
						ariaId="panel4"
						detailsSx={{ bgcolor: grey[50] }}
					>
						<PartialCharge frameNo={2} viewerObj={viewerObj} />
					</ResultDrawerSection>
				</ResultDrawer>
			</Grid>
		</>
	);
};

export default OrbitalViewer;
