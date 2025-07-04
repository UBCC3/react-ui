import {Box} from "@mui/material";
import {OrbitalViewer, VibrationViewer} from "../components/JSmol";
import OptimizationViewer from "../components/JSmol/OptimizationViewer";

const DevelopingPage = () => {
	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			{/*<VibrationViewer xyzFile={"/water-4-vib.xyz"} viewerObjId={"VibrationViewer"} />*/}
			{/*<OrbitalViewer moldenFile={"/example.molden"} viewerObjId={"JSmolApplet1"}/>*/}
			<OptimizationViewer xyzFile={"/qce_optim.xyz"} viewerObjId={"OptimizationViewer"}/>
		</Box>
	)
}

export default DevelopingPage;