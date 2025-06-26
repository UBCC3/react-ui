import {
	Box, Checkbox, FormControlLabel,
	Grid,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Slider, TextField,
	Typography
} from "@mui/material";
import {grey} from "@mui/material/colors";
import React, {useEffect, useState} from "react";
import MolmakerTextField from "../custom/MolmakerTextField";
import {parse} from "dotenv";

enum propertiesOptions {
	'density',
	'potential', // TODO ESP, HOMO, LUMO, Radical
	'homo',
	'lumo',
	'radicial'
}

interface OrbitalPropertyProps {
	viewerObj: any,

}

const OrbitalProperty: React.FC<OrbitalPropertyProps> = ({
	viewerObj,
}) => {

	// electron density
	const [propertyOption, setPropertyOption] = useState<false | propertiesOptions >(false);
	const [cutoff, setCutoff] = useState<number>(0.02);
	const [translucent, setTranslucent] = useState<number>(0.5);

	// slice plane
	const [sliceShow, setSliceShow] = useState<boolean>(false);
	const [sliceX, setSliceX] = useState<string>("0.000");
	const [sliceY, setSliceY] = useState<string>("0.000");
	const [sliceZ, setSliceZ] = useState<string>("0.000");
	const [sliceD, setSliceD] = useState<string>("0.000");
	const slicePlaneId = "slice1";

	useEffect(() => {
		if (!viewerObj) return;

		const script = sliceShow
			? `isosurface ID ${slicePlaneId} on;`
			: `isosurface ID ${slicePlaneId} off;`;
		window.Jmol.script(viewerObj, script);
	}, [sliceShow]);

	useEffect(() => {
		if (!viewerObj) return;
		if (!sliceShow) return;

		const placeSlicePlane = () => {
			const x = parseFloat(sliceX);
			const y = parseFloat(sliceY);
			const z = parseFloat(sliceZ);
			const d = parseFloat(sliceD);

			// TODO molden file does not support slice plane
			const script = `
				isosurface ID ${slicePlaneId} slab plane {${x} ${y} ${z} ${-d}};
				isosurface ID ${slicePlaneId} color red;
				isosurface ID ${slicePlaneId} translucent 0.4;
			`;

			window.Jmol.script(viewerObj, script);
		};

		placeSlicePlane();
	}, [sliceShow, sliceX, sliceY, sliceZ, sliceD]);

	useEffect(() => {
		if (!viewerObj) return;
		if (propertyOption === false) return;

		const showElectronDensity = () => {
			// console.log(`cutoff: ${cutoff}`);
			// console.log(`translucent: ${translucent}`);
			const script = `
				reset;
				mo density cutoff ${cutoff} translucent ${translucent} fill;
			`
			window.Jmol.script(viewerObj, script);
			return;
		}

		switch (+propertyOption) {
			case propertiesOptions.density:
				// console.log("run!");
				showElectronDensity();
				return;

			default:
				console.log("default");
				return;
		}
	}, [propertyOption, viewerObj, cutoff, translucent]);

	return (
		<Box
			sx={{
				width: "100%",
				height: '680px',
				overflow: "auto",
			}}
		>
			<List>
				<ListItem>
					<ListItemButton
						onClick={() => {
							setPropertyOption(propertiesOptions.density);
						}}
						sx={{
							borderRadius: 2,
							width: "100%",
							bgcolor: grey[100],
						}}
					>
						<ListItemText primary="Electron Density" />
					</ListItemButton>
				</ListItem>
				<ListItem>
					<ListItemButton
						onClick={() => {
							setPropertyOption(propertiesOptions.potential);
						}}
						sx={{
							borderRadius: 2,
							width: "100%",
							bgcolor: grey[100],
						}}
					>
						<ListItemText primary="Electrostatic potential" />
					</ListItemButton>
				</ListItem>
				<ListItem>
					<ListItemButton
						onClick={() => {
							setPropertyOption(propertiesOptions.homo);
						}}
						sx={{
							borderRadius: 2,
							width: "100%",
							bgcolor: grey[100],
						}}
					>
						<ListItemText primary="Electrophilic (HOMO) frontier density" />
					</ListItemButton>
				</ListItem>
				<ListItem>
					<ListItemButton
						onClick={() => {
							setPropertyOption(propertiesOptions.lumo);
						}}
						sx={{
							borderRadius: 2,
							width: "100%",
							bgcolor: grey[100],
						}}
					>
						<ListItemText primary="Electrophilic (LUMO) frontier density" />
					</ListItemButton>
				</ListItem>
				<ListItem>
					<ListItemButton
						onClick={() => {
							setPropertyOption(propertiesOptions.radicial);
						}}
						sx={{
							borderRadius: 2,
							width: "100%",
							bgcolor: grey[100],
						}}
					>
						<ListItemText primary="Radicial frontier density" />
					</ListItemButton>
				</ListItem>
			</List>
			<Box component="fieldset" sx={{ border: '1px solid gray', borderRadius: 2, p: 2, mt: 2 }}>
				<Box component="legend" sx={{ px: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
					Options
				</Box>
				<Typography >Cutoff</Typography>
				<Grid
					p={2}
					container
					spacing={0}
					direction="column"
					alignItems="center"
					justifyContent="center"
				>
					<Slider
						defaultValue={0.02}
						value={cutoff}
						min={0.005}
						max={0.05}
						step={0.005}
						onChange={(event: Event, newValue: number) => {
							setCutoff(newValue);
						}}
						marks={[
							{value: 0.005, label: "0.005"},
							{value: 0.02, label: "0.02"},
							{value: 0.05, label: "0.05"},
						]}
						valueLabelDisplay="auto"
						sx={{
							width: '80%',
						}}
					/>
				</Grid>
				<Typography gutterBottom>Opacity</Typography>
				<Grid
					p={2}
					container
					spacing={0}
					direction="column"
					alignItems="center"
					justifyContent="center"
				>
					<Slider
						value={translucent}
						onChange={(event: Event, newValue: number) => {
							setTranslucent(newValue);
						}}
						step={0.1}
						min={0}
						max={1}
						marks={[
							{ value: 0, label: '0%' },
							{ value: 0.5, label: '50%' },
							{ value: 1, label: '100%' },
						]}
						valueLabelDisplay="auto"
						sx={{width: '80%'}}
					/>
				</Grid>
			</Box>
			<Box component="fieldset" sx={{ border: '1px solid gray', borderRadius: 2, p: 2, mt: 2 }}>
				<Box component="legend" sx={{ px: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
					Slice plane
				</Box>
				<FormControlLabel
					control={
						<Checkbox
							checked={sliceShow}
							onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
								setSliceShow(event.target.checked);
							}}
						/>
					}
					label="Show slice"
				/>
				<Box>
					<Grid container spacing={2} sx={{alignItems: 'center', justifyContent: 'center'}}>
						<Grid container spacing={0} sx={{alignItems: "center", flexDirection: "column"}}>
							<Typography>ax +</Typography>
							<MolmakerTextField
								size="small"
								variant="outlined"
								value={sliceX}
								label={''}
								onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
									setSliceX(event.target.value);
								}}
								sx={{width: '4vw'}}
							/>
						</Grid>
						<Grid container spacing={0} alignItems={'center'} flexDirection={"column"}>
							<Typography>by +</Typography>
							<TextField
								size="small"
								variant="outlined"
								value={sliceY}
								label={''}
								onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
									setSliceY(event.target.value);
								}}
								sx={{ width: '4vw' }}
							/>
						</Grid>
						<Grid container spacing={0} alignItems={'center'} flexDirection={"column"}>
							<Typography>cz =</Typography>
							<MolmakerTextField
								size="small"
								variant="outlined"
								value={sliceZ}
								label={''}
								onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
									setSliceZ(event.target.value);
								}}
								sx={{ width: '4vw' }}
							/>
						</Grid>
						<Grid container spacing={0} alignItems={'center'} flexDirection={"column"}>
							<Typography>d</Typography>
							<MolmakerTextField
								size="small"
								variant="outlined"
								value={sliceD}
								label={''}
								onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
									setSliceD(event.target.value);
								}}
								sx={{ width: '4vw' }}
							/>
						</Grid>
					</Grid>
				</Box>

				<Typography sx={{ mt: 2 }}>Position</Typography>
				<Slider defaultValue={50} min={0} max={100} sx={{ mt: 1 }} />
			</Box>
		</Box>
	);
};

export default OrbitalProperty;