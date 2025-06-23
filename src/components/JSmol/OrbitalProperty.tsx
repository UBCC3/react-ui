import {
	Box,
	Grid,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Slider,
	Typography
} from "@mui/material";
import {grey} from "@mui/material/colors";
import React, {useEffect, useState} from "react";

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

	useEffect(() => {
		if (propertyOption === false) return;
		if (!viewerObj) return;

		const showElectronDensity = () => {
			// console.log(`cutoff: ${cutoff}`);
			// console.log(`translucent: ${translucent}`);
			const script = `mo density cutoff ${cutoff} translucent ${translucent} fill;`
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
				// p: 2,
				width: "100%",
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
		</Box>
	);
};

export default OrbitalProperty;