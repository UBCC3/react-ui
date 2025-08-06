import {
	Box,
	Grid,
	MenuList,
	MenuItem,
	ListItemText,
	Slider,
	Typography,
	FormGroup,
	FormControlLabel,
	Checkbox,
	TextField,
    RadioGroup,
    Radio
} from "@mui/material";
import { blue, blueGrey, grey } from "@mui/material/colors";
import React, { useEffect, useState } from "react";
import {JobResult} from "../../types";

enum propertiesOptions {
	density,
	potential,
}

interface OrbitalPropertyProps {
	viewerObj: any;
	meshOrFill: 'mesh' | 'fill';
	setMeshOrFill: React.Dispatch<React.SetStateAction<"fill" | "mesh">>;
}

const OrbitalProperty: React.FC<OrbitalPropertyProps> = ({
	viewerObj,
	meshOrFill,
	setMeshOrFill,
}) => {
	const [propertyOption, setPropertyOption] = useState<false | propertiesOptions>(false);
	const [cutoff, setCutoff] = useState<number>(0.02);
	const [translucent, setTranslucent] = useState<number>(0.5);
	const [showMolecule, setShowMolecule] = useState(true);
	const [showIsosurface, setShowIsosurface] = useState(true);

	// slice plane
	const [sliceShow, setSliceShow] = useState<boolean>(false);
	const [sliceX, setSliceX] = useState<string>("0.000");
	const [sliceY, setSliceY] = useState<string>("0.000");
	const [sliceZ, setSliceZ] = useState<string>("0.000");
	const [sliceD, setSliceD] = useState<string>("0.000");
	const slicePlaneId = "slice1";

	useEffect(() => {
		if (propertyOption === false || !viewerObj) return;

		const script = () => {
			switch (propertyOption) {
				case propertiesOptions.density:
					return `
						frame 1;
						label OFF;
						isosurface delete;
						mo delete all;
						mo density cutoff ${cutoff} translucent ${translucent} fill;
						MO titleFormat " ";
						zoom 50;
					`;
				case propertiesOptions.potential:
					return `
						frame 2;
						label OFF;
						isosurface delete;
						mo delete all;
						isosurface resolution 6 molecular map mep;
						isosurface translucent 0.5;
						zoom 50;
					`;
				default:
					return '';
			}
		};

		const cmd = script();
		if (cmd) {
			window.Jmol.script(viewerObj, cmd);
		}
	}, [propertyOption, viewerObj, cutoff, translucent]);

	useEffect(() => {
		if (!viewerObj) return;
		window.Jmol.script(
			viewerObj,
			sliceShow ? `isosurface ID ${slicePlaneId} ON;` : `isosurface ID ${slicePlaneId} OFF;`
		);
	}, [viewerObj, sliceShow]);

	useEffect(() => {
		if (!viewerObj) return;
		if (sliceX === "" || sliceY === "" || sliceZ === "" || sliceD === "") return;

		window.Jmol.script(
			viewerObj,
			`isosurface ID ${slicePlaneId} PLANE {${sliceX}, ${sliceY}, ${sliceZ}, ${sliceD}}; 
			isosurface ID ${slicePlaneId} ${sliceShow ? "ON":"OFF"};`
		);
	}, [viewerObj, sliceX, sliceY, sliceZ, sliceD, sliceShow]);

	useEffect(() => {
		if (!viewerObj) return;
		window.Jmol.script(viewerObj, showMolecule ? "display all" : "hide all");
	}, [viewerObj, showMolecule]);

	useEffect(() => {
		if (!viewerObj) return;
		window.Jmol.script(
			viewerObj,
			showIsosurface ? "mo on; isosurface on;" : "mo off; isosurface off;"
		);
	}, [viewerObj, showIsosurface]);

	return (
		<Grid container sx={{ width: '100%', height: '100%', bgcolor: grey[50], display: 'flex', flexDirection: 'row' }}>
			{/* Left menu: fixed width */}
			<Grid size={{ xs: 12 }} sx={{ flexShrink: 0 }}>
				<MenuList>
					{Object.entries({
						density: 'Electron Density',
						potential: 'Electrostatic potential',
					}).map(([key, label]) => (
						<MenuItem
							onClick={() => setPropertyOption(propertiesOptions[key as keyof typeof propertiesOptions])}
							selected={propertyOption === propertiesOptions[key as keyof typeof propertiesOptions]}
							sx={{
								mb: 1,
								mx: 1,
								p: 2,
								borderRadius: 2,
								bgcolor: grey[200],
								'&:hover': {
									backgroundColor: blueGrey[50],
								},
							}}
						>
							<ListItemText primary={label} />
						</MenuItem>
					))}
				</MenuList>
			</Grid>
			<Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', px: 2, pb: 2, flexGrow: 1, mt: 0, pt: 0 }}>
				{/* <Box component="legend" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
					Options
				</Box>
				<Typography gutterBottom>Cutoff</Typography>
				<Slider
					value={cutoff}
					min={0.005}
					max={0.05}
					step={0.005}
					marks={[{ value: 0.005, label: '0.005' }, { value: 0.02, label: '0.02' }, { value: 0.05, label: '0.05' }]}
					valueLabelDisplay="auto"
					onChange={(_, newValue) => setCutoff(newValue as number)}
					sx={{ width: '80%', alignSelf: 'center', my: 2 }}
				/>
				<Typography gutterBottom>Opacity</Typography>
				<Slider
					value={translucent}
					min={0}
					max={1}
					step={0.1}
					marks={[{ value: 0, label: '0%' }, { value: 0.5, label: '50%' }, { value: 1, label: '100%' }]}
					valueLabelDisplay="auto"
					onChange={(_, newValue) => setTranslucent(newValue as number)}
					sx={{ width: '80%', alignSelf: 'center', my: 2 }}
				/> */}
				<Box sx={{ border: '1px solid', borderRadius: 2, p: 1, borderColor: 'divider' }}>
					<Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
						Display
					</Typography>
					<RadioGroup sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
						<FormControlLabel
							control={<Radio checked={meshOrFill === "fill"} onChange={(_, checked) => setMeshOrFill("fill")} />}
							label="Orbital Shape: Fill"
						/>
						<FormControlLabel
							control={<Radio checked={meshOrFill === "mesh"} onChange={(_, checked) => setMeshOrFill("mesh")} />}
							label="Mesh"
						/>
					</RadioGroup>
					<FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
						<FormControlLabel
							control={<Checkbox checked={showMolecule} onChange={(_, checked) => setShowMolecule(checked)} />}
							label="Show molecule"
						/>
						<FormControlLabel
							control={<Checkbox checked={showIsosurface} onChange={(_, checked) => setShowIsosurface(checked)} />}
							label="Show isosurface"
						/>
					</FormGroup>
				</Box>
				<Box sx={{ border: '1px solid', borderRadius: 2, p: 1, mt: 1, borderColor: 'divider' }}>
					<Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
						Mapped properties
					</Typography>
					<FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
						<FormControlLabel control={<Checkbox defaultChecked />} label="Auto scale range" />
						{/* min and max input fields for manual range setting */}
						<Box sx={{ display: 'flex', gap: 1 }}>
							<TextField
								label="Min"
								variant="outlined"
								size="small"
								sx={{ width: '80px' }}
								defaultValue="-0.05"
							/>
							<TextField
								label="Max"
								variant="outlined"
								size="small"
								sx={{ width: '80px' }}
								defaultValue="0.05"
							/>
						</Box>
					</FormGroup>
				</Box>
				<Box sx={{ border: '1px solid', borderRadius: 2, p: 1, mt: 1, borderColor: 'divider' }}>
					<Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>
						Slice plane
					</Typography>
					<FormGroup sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
						<FormControlLabel
							control={
								<Checkbox
									checked={sliceShow}
									onChange={(_, checked) => setSliceShow(checked)}
								/>
							}
							label="Show slice plane"
						/>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
							<TextField
								label="ax + "
								variant="outlined"
								size="small"
								value={sliceX}
								sx={{ width: '80px' }}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {setSliceX(e.currentTarget.value);}}
							/>
							<TextField
								label="by + "
								variant="outlined"
								size="small"
								value={sliceY}
								sx={{ width: '80px' }}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {setSliceY(e.currentTarget.value);}}
							/>
							<TextField
								label="cz = "
								variant="outlined"
								size="small"
								value={sliceZ}
								sx={{ width: '80px' }}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {setSliceZ(e.currentTarget.value);}}
							/>
							<TextField
								label="d"
								variant="outlined"
								size="small"
								value={sliceD}
								sx={{ width: '80px' }}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {setSliceD(e.currentTarget.value);}}
							/>
						</Box>
					</FormGroup>
				</Box>
			</Grid>

		</Grid>
	);
};

export default OrbitalProperty;
