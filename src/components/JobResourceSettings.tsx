import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Grid,
	Typography,
} from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { getJobResourceSettings } from "../services/api";
import type { JobResourceConfig, JobResourceSelection } from "../types";
import { MolmakerTextField } from "./custom";

interface JobResourceSettingsProps {
	onChange: (value: JobResourceSelection, isValid: boolean) => void;
}

function parseBoundedInteger(value: string, minimum: number, maximum: number): number | null {
	if (!/^\d+$/.test(value)) return null;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function formatMemory(memoryMb: number): string {
	return memoryMb % 1024 === 0 ? `${memoryMb / 1024} GiB` : `${memoryMb} MiB`;
}

/** Admin-only controls for overriding the backend's per-job resource defaults. */
export default function JobResourceSettings({ onChange }: JobResourceSettingsProps) {
	const { getAccessTokenSilently } = useAuth0();
	const [config, setConfig] = useState<JobResourceConfig | null>(null);
	const [expanded, setExpanded] = useState(false);
	const [timeLimit, setTimeLimit] = useState("");
	const [memory, setMemory] = useState("");

	useEffect(() => {
		let active = true;

		const loadSettings = async () => {
			const token = await getAccessTokenSilently();
			const response = await getJobResourceSettings(token);
			if (active && response.data) setConfig(response.data as JobResourceConfig);
		};

		loadSettings().catch((error) => {
			console.error("Failed to load job resource settings", error);
		});
		return () => {
			active = false;
		};
	}, [getAccessTokenSilently]);

	if (!config?.can_customize) return null;

	const timeRange = config.time_limit_minutes;
	const memoryRange = config.memory_mb;
	const parsedTime = parseBoundedInteger(timeLimit, timeRange.minimum, timeRange.maximum);
	const parsedMemory = parseBoundedInteger(memory, memoryRange.minimum, memoryRange.maximum);

	const publish = (nextTime: string, nextMemory: string) => {
		const validTime = parseBoundedInteger(nextTime, timeRange.minimum, timeRange.maximum);
		const validMemory = parseBoundedInteger(nextMemory, memoryRange.minimum, memoryRange.maximum);
		const isValid = validTime !== null && validMemory !== null;
		onChange(isValid ? { timeLimitMinutes: validTime, memoryMb: validMemory } : {}, isValid);
	};

	return (
		<Accordion
			disableGutters
			expanded={expanded}
			onChange={(_event, isExpanded) => {
				setExpanded(isExpanded);
				if (!isExpanded) {
					onChange({}, true);
					return;
				}
				const defaultTime = String(timeRange.default);
				const defaultMemory = String(memoryRange.default);
				setTimeLimit(defaultTime);
				setMemory(defaultMemory);
				publish(defaultTime, defaultMemory);
			}}
			elevation={0}
			sx={{ border: 1, borderColor: "divider", borderRadius: "8px !important" }}
		>
			<AccordionSummary expandIcon={<ExpandMoreOutlined />}>
				<Box>
					<Typography fontWeight={600}>Resource settings</Typography>
					<Typography variant="body2" color="text.secondary">
						System defaults: {timeRange.default} minutes · {formatMemory(memoryRange.default)}
					</Typography>
				</Box>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Adjust the maximum runtime and memory requested from the cluster for this job.
				</Typography>
				<Grid container spacing={2}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<MolmakerTextField
							label="Runtime limit (minutes)"
							type="number"
							value={timeLimit}
							onChange={(event) => {
								const next = event.target.value;
								setTimeLimit(next);
								publish(next, memory);
							}}
							error={parsedTime === null}
							helperText={`Whole number from ${timeRange.minimum} to ${timeRange.maximum}`}
							slotProps={{
								htmlInput: { min: timeRange.minimum, max: timeRange.maximum, step: 1 },
							}}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<MolmakerTextField
							label="Memory (MiB)"
							type="number"
							value={memory}
							onChange={(event) => {
								const next = event.target.value;
								setMemory(next);
								publish(timeLimit, next);
							}}
							error={parsedMemory === null}
							helperText={`Whole number from ${memoryRange.minimum} to ${memoryRange.maximum} MiB`}
							slotProps={{
								htmlInput: { min: memoryRange.minimum, max: memoryRange.maximum, step: 1 },
							}}
						/>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
}
