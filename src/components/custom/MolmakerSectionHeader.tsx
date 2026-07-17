import { Typography, type SxProps, type Theme } from "@mui/material";
import PropTypes from "prop-types";
import { grey } from "@mui/material/colors";

interface MolmakerSectionHeaderProps {
    text: string;
    sx?: SxProps<Theme>;
}

/**
 * MolmakerSectionHeader component for displaying section headers in the Molmaker form.
 *
 * Props:
 * - text: string (header text)
 * - sx: object (optional styling overrides)
 */
const MolmakerSectionHeader = ({ text, sx = {} }: MolmakerSectionHeaderProps) => {
	return (
		<Typography variant="body2" color={grey[600]} sx={{ ...sx }}>
			{text}
		</Typography>
	);
};

/**
 * Runtime prop validation for MolmakerSectionHeader.
 */
MolmakerSectionHeader.propTypes = {
	text: PropTypes.string.isRequired,
	sx: PropTypes.object,
};

export default MolmakerSectionHeader;
