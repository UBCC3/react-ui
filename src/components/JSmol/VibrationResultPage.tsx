import {Box} from "@mui/material";
import {VibrationViewer} from "./index";

const VibrationResultPage = () => {
	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<VibrationViewer xyzFile={"/water-4-vib.xyz"} viewerObjId={"VibrationViewer"} />
		</Box>
	)
}

export default VibrationResultPage;