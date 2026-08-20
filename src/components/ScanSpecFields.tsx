import React from "react";
import {
	Box,
	Checkbox,
	Divider,
	FormControlLabel,
	FormHelperText,
	Grid,
	MenuItem,
	TextField,
} from "@mui/material";
import {
	MolmakerDropdown,
	MolmakerRadioGroup,
	MolmakerSectionHeader,
	MolmakerTextField,
} from "./custom";
import { COORDINATE_OPTIONS, SLOT_LABELS } from "../hooks/UseScanSpec";
import type { ScanCoordinate, RangeMode, ScanSpecState } from "../hooks/UseScanSpec";
import { formatMeasurement } from "../utils";
import type { XyzAtom } from "../utils/parseXyz";

interface ScanSpecFieldsProps {
	scan: ScanSpecState;
	/** Atoms parsed from the selected structure, used to populate the pickers. */
	atomOptions: XyzAtom[];
	submitAttempted: boolean;
	showAtomNumbers: boolean;
	onShowAtomNumbersChange: (show: boolean) => void;
}

/**
 * The scan specification inputs: which coordinate, which atoms, and the range
 * of values to step through.
 *
 * Shared by the workflow scan page and the custom job page. It deliberately
 * excludes method and basis set, which differ between the two: the workflow
 * fixes them, while a custom job lets the user choose.
 */
const ScanSpecFields: React.FC<ScanSpecFieldsProps> = ({
	scan,
	atomOptions,
	submitAttempted,
	showAtomNumbers,
	onShowAtomNumbersChange,
}) => (
	<>
		<Grid sx={{ mx: 2 }}>
			<MolmakerSectionHeader text="What do you want to scan?" sx={{ mb: 2 }} />
			<TextField
				select
				fullWidth
				label="Scan type"
				value={scan.coordinate}
				onChange={(e) => scan.setCoordinate(e.target.value as ScanCoordinate)}
			>
				{COORDINATE_OPTIONS.map((option) => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
			</TextField>

			<Box display="flex" gap={2} sx={{ mt: 2 }}>
				{Array.from({ length: scan.expectedAtomCount }, (_, slot) => (
					<MolmakerDropdown
						key={slot}
						label={SLOT_LABELS[scan.coordinate][slot]}
						value={scan.atomSlots[slot] ?? ""}
						onChange={(e) => scan.handleAtomSlotChange(slot, e.target.value as number)}
						options={atomOptions
							// Hide atoms already taken by another slot, but keep this slot's own
							// pick so it still renders as the selected value.
							.filter(
								(a) => a.index === scan.atomSlots[slot] || !scan.parsedAtoms.includes(a.index),
							)
							.map((a) => ({ value: a.index, label: a.label }))}
						required
						disabled={atomOptions.length === 0}
						error={submitAttempted && !scan.atomsValid}
					/>
				))}
			</Box>
			<FormHelperText sx={{ mt: 1 }}>
				{atomOptions.length === 0
					? "Upload or select a molecule to choose atoms."
					: `Numbers match the preview — tick "Show atom numbers" to see them.`}
				{scan.currentValue !== null &&
					` Current value: ${formatMeasurement(scan.coordinate, scan.currentValue)}.`}
			</FormHelperText>

			<FormControlLabel
				control={
					<Checkbox
						size="small"
						checked={showAtomNumbers}
						onChange={(e) => onShowAtomNumbersChange(e.target.checked)}
					/>
				}
				label="Show atom numbers in preview"
			/>
		</Grid>

		<Divider />

		<Grid sx={{ mx: 2 }}>
			<MolmakerSectionHeader text="Range of values" sx={{ mb: 1 }} />
			<MolmakerRadioGroup
				name="rangeMode"
				value={scan.rangeMode}
				onChange={(_event: unknown, val: string) => scan.setRangeMode(val as RangeMode)}
				options={[
					{ value: "steps", label: "Number of steps" },
					{ value: "spacing", label: "Step size" },
					{ value: "values", label: "Specific values" },
				]}
				row
			/>

			{scan.rangeMode !== "values" ? (
				<Box display="flex" gap={2} sx={{ mt: 2 }}>
					<MolmakerTextField
						label={`Minimum (${scan.unitLabel})`}
						value={scan.rangeMin}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => scan.setRangeMin(e.target.value)}
						required
					/>
					<MolmakerTextField
						label={`Maximum (${scan.unitLabel})`}
						value={scan.rangeMax}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => scan.setRangeMax(e.target.value)}
						required
					/>
					{scan.rangeMode === "steps" ? (
						<MolmakerTextField
							label="Number of steps"
							value={scan.rangeSteps}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								scan.setRangeSteps(e.target.value)
							}
							required
						/>
					) : (
						<MolmakerTextField
							label={`Step size (${scan.unitLabel})`}
							value={scan.rangeSpacing}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								scan.setRangeSpacing(e.target.value)
							}
							required
						/>
					)}
				</Box>
			) : (
				<MolmakerTextField
					label={`Values (${scan.unitLabel})`}
					value={scan.rangeValues}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => scan.setRangeValues(e.target.value)}
					required
					sx={{ mt: 2 }}
					helperText="Comma-separated, for example 23, 256, 300"
				/>
			)}
		</Grid>

		<Divider />

		<Grid sx={{ mx: 2 }}>
			<MolmakerSectionHeader text="Relax the structure during the scan?" sx={{ mb: 1 }} />
			<MolmakerRadioGroup
				name="relax"
				value={scan.relax ? "yes" : "no"}
				onChange={(_event: unknown, val: string) => scan.setRelax(val === "yes")}
				options={[
					{ value: "no", label: "No" },
					{ value: "yes", label: "Yes" },
				]}
				row
			/>
		</Grid>
	</>
);

export default ScanSpecFields;
