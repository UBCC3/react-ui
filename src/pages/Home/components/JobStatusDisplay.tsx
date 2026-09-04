import React from "react";
import { BlockOutlined } from "@mui/icons-material";
import { Box, Chip, Tooltip } from "@mui/material";
import { grey } from "@mui/material/colors";

import { failureReasonLabels, statusColors, statusIcons } from "../../../constants";
import type { Job } from "../../../types";
import { hasPendingCancellation } from "../../../utils";

interface JobStatusDisplayProps {
	job: Job;
}

/** Displays the real job status plus any pending cancellation request. */
export default function JobStatusDisplay({ job }: JobStatusDisplayProps) {
	const failureDetails = job.failure_reason
		? `${failureReasonLabels[job.failure_reason] ?? job.failure_reason}${
				job.failure_message ? `: ${job.failure_message}` : ""
			}`
		: "";

	return (
		<Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
			<Tooltip title={failureDetails}>
				<Chip
					label={job.status}
					size="small"
					sx={{
						bgcolor: statusColors[job.status] ?? grey[300],
						color: "white",
						textTransform: "capitalize",
						fontSize: "0.65rem",
					}}
					icon={
						statusIcons[job.status]
							? React.createElement(statusIcons[job.status], {
									style: { color: "white", width: 16, height: 16 },
								})
							: undefined
					}
				/>
			</Tooltip>
			{hasPendingCancellation(job) && (
				<Tooltip title="The cancellation request is waiting to be processed.">
					<Chip
						label="Cancellation requested"
						icon={<BlockOutlined />}
						color="warning"
						variant="outlined"
						size="small"
						sx={{ fontSize: "0.65rem" }}
					/>
				</Tooltip>
			)}
		</Box>
	);
}
