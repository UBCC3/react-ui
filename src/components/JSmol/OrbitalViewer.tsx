import React, { useEffect, useRef, useState } from "react";
import {
	Box,
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell, TableContainer,
	TableHead,
	TablePagination,
	TableRow
} from "@mui/material";
import {Orbital} from "../../types";

declare global {
	interface Window {
		Jmol: any;
	}
}

interface OrbitalViewerProp {
	moldenFile: string,
	viewerObjId: string,
}

const OrbitalViewer: React.FC<OrbitalViewerProp> = ({
	moldenFile,
	viewerObjId,
}) => {
	const viewerRef = useRef<HTMLDivElement>(null);

	const [viewerObj, setViewerObj] = useState<any>(null);

	// orbital table
	const [orbitals, setOrbitals] = useState<Orbital[]>([]);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [page, setPage] = useState(0);
	const [selectedOrbital, setSelectedOrbital] = useState<Orbital>(null);

	useEffect(() => {
		if (orbitals.length === 0) return;

		if (selectedOrbital === null) return;

		const showOrbital = () => {
			const script= `
				mo ${selectedOrbital.index};
			`;
			window.Jmol.script(viewerObj, script);
			return;
		}

		showOrbital();
	}, [orbitals, selectedOrbital]);

	useEffect(() => {
		if (!viewerObj) return;

		function fetchOrbitals() {
			const mos = window.Jmol.getPropertyAsArray(
				viewerObj,
				"auxiliaryInfo.models[0].moData.mos",
			);

			const orbitalsArray: Orbital[] = mos.map((mo: any, idx: number):Orbital => ({
				index: mo.index,
				energy: mo.energy,
				occupancy: mo.occupancy,
				spin: mo.spin,
				symmetry: mo.symmetry,
				type: mo.type,
			}));

			setOrbitals(orbitalsArray);
		}

		fetchOrbitals();
	}, [viewerObj]);

	useEffect(() => {
		const jsmolIsReady = (viewerObj: any) => {
			window.Jmol.script(viewerObj, `
			    reset;
			    zoom 50;
			`);

			setViewerObj(viewerObj);
		}

		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: "/jsmol/j2s",
			src: moldenFile,
			script: `
				load "${moldenFile}";
			`,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
		};

		window.Jmol.getApplet(viewerObjId, Info);
		if (viewerRef.current) {
			viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);
		}
	}, []);

	const handleChangePage = (_: any, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(e.target.value, 10));
		setPage(0);
	};

	return (
		<Grid container spacing={2}>
			<Grid size={12}>
				<Paper elevation={3} sx={{padding: 4}}>
					<Grid container spacing={2} alignItems="stretch" sx={{ height: '80%' }}>
						<Grid sx={{ xs: 12, md: 4, display: 'flex', flexDirection: 'column', width: '25%', height: '100%' }}>
							<TableContainer>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell>Sym</TableCell>
											<TableCell>Eigenvalue (a.u.)</TableCell>
											<TableCell>Occ</TableCell>
											<TableCell>Spin</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{orbitals
											.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
											.map(orbital => (
												<TableRow
													key={orbital.index}
													onClick={() => {
														setSelectedOrbital(orbital);
													}}
													sx={{
														backgroundColor: (
															selectedOrbital !== null &&
															orbital.index === selectedOrbital.index
														) ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
														cursor: 'pointer'
													}}
												>
													<TableCell>{orbital.index}</TableCell>
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
								onRowsPerPageChange={handleChangeRowsPerPage}
								rowsPerPageOptions={[5, 10, 25]}
							/>
						</Grid>
						<Grid sx={{ xs: 12, md: 8, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative'}}>
							<Box
								ref={viewerRef}
								sx={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
							/>
						</Grid>
					</Grid>
				</Paper>
			</Grid>
		</Grid>
	);
};

export default OrbitalViewer;