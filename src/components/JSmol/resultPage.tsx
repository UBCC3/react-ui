import {Box, Grid} from "@mui/material";
import {OrbitalViewer} from "./index";

const resultPage = () => {

	return (
		<Box bgcolor="rgb(247, 249, 252)" p={4}>
			<OrbitalViewer moldenFile={"/example.molden"} viewerObjId={"JSmolApplet1"}/>
		</Box>
	)
}

export default resultPage;