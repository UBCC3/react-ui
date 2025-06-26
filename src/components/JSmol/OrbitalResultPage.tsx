import {Box} from "@mui/material";
import {OrbitalViewer} from "./index";

const OrbitalResultPage = () => {

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<OrbitalViewer moldenFile={"/example.molden"} viewerObjId={"JSmolApplet1"}/>
		</Box>
	)
}

export default OrbitalResultPage;