import {Box, Grid} from "@mui/material";
import {OrbitalViewer} from "./index";
import VibrationViewer from "./VibrationViewer";

const vibrationResult = () => {

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<VibrationViewer xyzFile={"/water-4-vib.xyz"} viewerObjId={"JSmolApplet1"}/>
		</Box>
	)
}

export default vibrationResult;