import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
	Box,
	Paper,
	Divider,
	Grid,
	Button,
	Tooltip,
	IconButton,
	Autocomplete,
	TextField,
	MenuItem,
	FormControlLabel,
	Checkbox,
	FormHelperText,
} from "@mui/material";
import { PlayCircleOutlineOutlined, InfoOutline } from "@mui/icons-material";
import {
	MolmakerTextField,
	MolmakerMoleculeSelector,
	MolmakerSectionHeader,
	MolmakerRadioGroup,
	MolmakerMoleculePreview,
	MolmakerLoading,
	MolmakerAlert,
	MolmakerPageTitle,
	MolmakerDropdown,
} from "../../components/custom";
import {
	getLibraryStructures,
	getStructureDataFromS3,
	AddAndUploadStructureToS3,
	getChemicalFormula,
	getStructuresTags,
	submitBondAngleScan,
} from "../../services/api";
import { Structure } from "../../types";
import { APP_BAR_HEIGHT, unpairedElectronOptions } from "../../constants";
import { grey } from "@mui/material/colors";
import { formatMeasurement, measureCoordinate, parseXyzAtoms } from "../../utils";

/** Which internal coordinate the scan varies. */
type ScanCoordinate = "bond" | "angle" | "dihedral";

/** How the user specifies the range of values to scan over. */
type RangeMode = "steps" | "spacing" | "values";

const COORDINATE_OPTIONS: {
	value: ScanCoordinate;
	label: string;
	atomCount: number;
	example: string;
}[] = [
	{ value: "bond", label: "Bond length (2 atoms)", atomCount: 2, example: "1, 2" },
	{ value: "angle", label: "Bond angle (3 atoms)", atomCount: 3, example: "1, 2, 3" },
	{ value: "dihedral", label: "Dihedral angle (4 atoms)", atomCount: 4, example: "3, 1, 2, 6" },
];

const SLOT_LABELS: Record<ScanCoordinate, string[]> = {
	bond: ["Atom 1", "Atom 2"],
	angle: ["Atom 1", "Vertex atom", "Atom 3"],
	dihedral: ["Atom 1", "Axis atom 1", "Axis atom 2", "Atom 4"],
};

export default function BondAngleScan() {
	// used to redirect the user after the job is successfully submitted
	const navigate = useNavigate();
	const { getAccessTokenSilently } = useAuth0();

	// state for user experience
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

	// state for structure preview
	const [structureData, setStructureData] = useState<string>("");
	const [showAtomNumbers, setShowAtomNumbers] = useState<boolean>(true);

	// state for basic job information
	const [jobName, setJobName] = useState<string>("");
	const [jobNotes, setJobNotes] = useState<string>("");
	const [jobTags, setJobTags] = useState<string[]>([]);

	// controls the source of the molecule
	const [source, setSource] = useState<"upload" | "library">("upload");

	// state for uploaded or selected molecule structure
	const [file, setFile] = useState<File | null>(null);
	const [uploadStructure, setUploadStructure] = useState<boolean>(false);
	const [structures, setStructures] = useState<Structure[]>([]);
	const [selectedStructure, setSelectedStructure] = useState<string>("");

	// metadata used when saving an uploaded structure to the library
	const [structureName, setStructureName] = useState<string>("");
	const [chemicalFormula, setChemicalFormula] = useState<string>("");
	const [structureNotes, setStructureNotes] = useState<string>("");
	const [structureTags, setStructureTags] = useState<string[]>([]);

	// state for calculation parameters
	const [charge, setCharge] = useState<number>(0);
	const [multiplicity, setMultiplicity] = useState<number>(1);

	// state for the scan specification
	const [coordinate, setCoordinate] = useState<ScanCoordinate>("bond");
	const [atomSlots, setAtomSlots] = useState<(number | "")[]>([]);
	const [rangeMode, setRangeMode] = useState<RangeMode>("steps");
	const [rangeMin, setRangeMin] = useState<string>("");
	const [rangeMax, setRangeMax] = useState<string>("");
	const [rangeSteps, setRangeSteps] = useState<string>("10");
	const [rangeSpacing, setRangeSpacing] = useState<string>("");
	const [rangeValues, setRangeValues] = useState<string>("");
	const [relax, setRelax] = useState<boolean>(false);

	// available tag options shown in the autocomplete input
	const [options, setOptions] = useState<string[]>([]);

	// structure preview snapshot confirm
	const [submitConfirmed, setSubmitConfirmed] = useState(false);
	const [structureImageData, setStructureImageData] = useState<string>("");

	// derived scan helpers
	const selectedCoordinate =
		COORDINATE_OPTIONS.find((o) => o.value === coordinate) ?? COORDINATE_OPTIONS[0];
	const expectedAtomCount = selectedCoordinate.atomCount;
	const unitLabel = coordinate === "bond" ? "Å" : "°";

	const parsedValues = rangeValues
		.split(",")
		.map((part) => parseFloat(part.trim()))
		.filter((n) => Number.isFinite(n));

	const atomOptions = useMemo(() => parseXyzAtoms(structureData), [structureData]);

	// Order matters, so keep slot order and treat a partly-filled set as invalid.
	const parsedAtoms = atomSlots.filter((a): a is number => a !== "");

	const atomsValid =
		parsedAtoms.length === expectedAtomCount && new Set(parsedAtoms).size === expectedAtomCount;

	const currentValue = useMemo(() => {
		if (!atomsValid) return null;
		const points = parsedAtoms.map((i) => atomOptions.find((a) => a.index === i)!.position);
		return measureCoordinate(coordinate, points);
	}, [atomsValid, parsedAtoms, atomOptions, coordinate]);

	/**
	 * Continues job submission after the molecule preview image has been captured.
	 */
	useEffect(() => {
		const getStructureImageSubmit = async () => {
			if (!submitConfirmed || structureImageData === "") return;

			await performSubmitJob();
			setSubmitConfirmed(false);
		};

		getStructureImageSubmit();
	}, [structureImageData]);

	// fetch library
	useEffect(() => {
		const loadLibraryStructures = async () => {
			try {
				setLoading(true);
				const token = await getAccessTokenSilently();
				const response = await getLibraryStructures(token);
				if (response.error) {
					setError("Failed to fetch library. Please try again later.");
					return;
				}
				let res = response.data;
				res = [
					{
						structure_id: "",
						name: "Select a molecule",
						user_sub: "",
						location: "",
					},
					...res,
				];
				setStructures(res);
			} catch (err) {
				setError("Failed to fetch library. Please try again later.");
				console.error("Failed to fetch library", err);
			} finally {
				setLoading(false);
			}
		};

		const fetchTags = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getStructuresTags(token);
				if (response.data) {
					setOptions(response.data);
				}
			} catch (err) {
				console.error("Failed to fetch tags", err);
			}
		};

		setLoading(true);
		loadLibraryStructures();
		fetchTags();
	}, [getAccessTokenSilently]);

	// Clear the picks whenever the atom set or the number of slots changes.
	useEffect(() => {
		setAtomSlots(Array(expectedAtomCount).fill(""));
	}, [expectedAtomCount, structureData]);

	// Handle switching between upload / library
	const handleSourceChange = (source: "upload" | "library") => {
		setSource(source);
		setSubmitAttempted(false);

		if (source === "upload") {
			setSelectedStructure("");
		} else {
			setFile(null);
			setUploadStructure(false);
		}

		setStructureData("");
		setError(null);
	};

	// Handles selecting a molecule from the user's library
	const handleLibrarySelect = async (structure_id: string) => {
		setSelectedStructure(structure_id);
		setFile(null);
		setUploadStructure(false);
		setStructureData("");
		setError(null);

		if (!structure_id) return;

		try {
			setLoading(true);
			const token = await getAccessTokenSilently();
			const response = await getStructureDataFromS3(structure_id, token);
			if (response.error) {
				setError("Failed to load structure. Please try again or select a different molecule.");
				return;
			}
			setStructureData(response.data);
		} catch (err) {
			setError("Failed to load structure. Please try again or select a different molecule.");
			console.error("Failed to load structure", err);
		} finally {
			setLoading(false);
		}
	};

	// Handles uploading a molecule file from the user's computer
	const handleFileChange = async (data: string, file: File | null) => {
		setStructureData(data);
		setFile(file);

		if (file && file.name.endsWith(".xyz")) {
			try {
				const token = await getAccessTokenSilently();
				const formula = await getChemicalFormula(file, token);
				setChemicalFormula(formula.data["formula"] || "");
			} catch (err) {
				console.error("Failed to get chemical formula", err);
				setError("Failed to get chemical formula. Please try again.");
			}
		} else {
			setError("Please upload a valid .xyz file.");
			setStructureData("");
		}
	};

	const handleAtomSlotChange = (slot: number, value: number | "") => {
		setAtomSlots((prev) => {
			const next = [...prev];
			next[slot] = value;
			return next;
		});
	};

	/**
	 * Assembles the scan specification in the shape the cluster's
	 * normalise_scan_values() accepts: an explicit value list, a min/max/steps
	 * count, or a min/max/spacing increment.
	 */
	const buildScanSpec = () => {
		const base = { coordinate, atoms: parsedAtoms, relax };

		if (rangeMode === "values") {
			return { ...base, values: parsedValues };
		}
		if (rangeMode === "steps") {
			return {
				...base,
				min: parseFloat(rangeMin),
				max: parseFloat(rangeMax),
				steps: parseInt(rangeSteps, 10),
			};
		}
		return {
			...base,
			min: parseFloat(rangeMin),
			max: parseFloat(rangeMax),
			spacing: parseFloat(rangeSpacing),
		};
	};

	/** Returns an error message when the scan settings are incomplete. */
	const validateScan = (): string | null => {
		if (!atomsValid) {
			return `Please enter ${expectedAtomCount} distinct atom numbers for a ${coordinate} scan.`;
		}
		if (rangeMode === "values") {
			if (parsedValues.length < 2) return "Please enter at least two scan values.";
			return null;
		}
		if (!rangeMin || !rangeMax) return "Please enter both a minimum and a maximum.";
		if (parseFloat(rangeMin) === parseFloat(rangeMax)) {
			return "The minimum and maximum must be different.";
		}
		if (rangeMode === "steps" && parseInt(rangeSteps, 10) < 2) {
			return "A scan needs at least two steps.";
		}
		if (rangeMode === "spacing" && !(parseFloat(rangeSpacing) > 0)) {
			return "The step size must be greater than zero.";
		}
		return null;
	};

	// Performs the full job submission process
	async function performSubmitJob() {
		setSubmitAttempted(true);
		setError(null);

		let structureIdToUse = selectedStructure;
		const uploadFile = file;

		if (!jobName) {
			setError("Please enter a job name.");
			return;
		}
		if (source === "upload" && !uploadFile) {
			setError("Please upload a structure file.");
			return;
		}
		if (source === "library" && !structureIdToUse) {
			setError("Please select a molecule from the library.");
			return;
		}

		const scanError = validateScan();
		if (scanError) {
			setError(scanError);
			return;
		}

		setLoading(true);
		try {
			const token = await getAccessTokenSilently();

			// Save the uploaded structure first, so the job can be linked to it.
			if (uploadStructure && source === "upload" && uploadFile) {
				const structureResponse = await AddAndUploadStructureToS3(
					uploadFile,
					structureName,
					chemicalFormula,
					structureNotes,
					structureImageData,
					token,
					structureTags,
				);
				if (structureResponse.error) {
					throw new Error(structureResponse.error);
				}
				structureIdToUse = structureResponse.data.structure_id;
			}

			const response = await submitBondAngleScan(token, {
				file: source === "upload" && uploadFile ? uploadFile : undefined,
				structureId: source === "library" ? structureIdToUse : undefined,
				charge,
				multiplicity,
				scan: buildScanSpec(),
				jobName,
				jobNotes: jobNotes || undefined,
				tags: jobTags,
			});
			if (response.error) {
				throw new Error(response.error);
			}

			setSubmitAttempted(false);
			navigate("/");
		} catch (err) {
			setError("Failed to submit job. Please try again later.");
			console.error("Failed to submit job", err);
		} finally {
			setLoading(false);
		}
	}

	// Handles the form submit event
	const handleSubmitJob = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// If the user wants to save an uploaded structure, first capture the
		// molecule preview snapshot, then continue in the effect above.
		if (uploadStructure && source === "upload") {
			setSubmitConfirmed(true);
			return;
		}

		performSubmitJob();
	};

	if (loading) {
		return <MolmakerLoading />;
	}

	return (
		<Box p={4} className="bg-stone-100" sx={{ minHeight: `calc(100vh - 64px)` }}>
			<MolmakerPageTitle
				title="Bond/Angle Scan"
				subtitle="Vary a bond, angle, or dihedral across a range of values."
			/>

			<Grid container spacing={3} alignItems="flex-start">
				<Grid size={{ xs: 12, md: 6 }}>
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50] }}>
						<Box component="form" onSubmit={handleSubmitJob}>
							<Grid container direction="column" spacing={2}>
								{/* Error message */}
								{error && <MolmakerAlert text={error} severity="error" outline="error" />}

								{/* Info message */}
								<Grid sx={{ mx: 2, mt: 3 }}>
									<MolmakerSectionHeader text="Required fields are marked with *" />
								</Grid>

								{/* Job name, notes, tags */}
								<Grid sx={{ mx: 2 }}>
									<MolmakerTextField
										label="Job Name"
										value={jobName}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setJobName(e.target.value)
										}
										required
										error={submitAttempted && !jobName}
										helperText={submitAttempted && !jobName ? "Please enter a job name" : ""}
									/>
									<MolmakerTextField
										label="Job Notes"
										value={jobNotes}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setJobNotes(e.target.value)
										}
										multiline
										rows={3}
										sx={{ mt: 2 }}
									/>
									<Autocomplete
										multiple
										freeSolo
										id="tags-input"
										options={options}
										value={jobTags}
										onChange={(_, newValue) => {
											setJobTags(newValue.filter((tag) => tag.trim() !== ""));
										}}
										renderInput={(params) => (
											<TextField
												{...params}
												variant="outlined"
												label="Tags"
												placeholder="Press enter to add tags"
											/>
										)}
										sx={{ mt: 2 }}
									/>
								</Grid>

								<Divider />

								{/* Molecule selector */}
								<MolmakerMoleculeSelector
									source={source as "upload" | "library"}
									onSourceChange={handleSourceChange}
									structures={structures}
									selectedStructure={selectedStructure}
									onLibrarySelect={handleLibrarySelect}
									file={file}
									onFileChange={handleFileChange}
									uploadStructure={uploadStructure}
									onUploadStructureChange={setUploadStructure}
									moleculeName={structureName}
									onMoleculeNameChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setStructureName(e.target.value)
									}
									chemicalFormula={chemicalFormula}
									onChemicalFormulaChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setChemicalFormula(e.target.value)
									}
									moleculeNotes={structureNotes}
									onMoleculeNotesChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setStructureNotes(e.target.value)
									}
									structureTags={structureTags}
									onStructureTagsChange={(_event: React.SyntheticEvent, value: string[]) =>
										setStructureTags(value)
									}
									submitAttempted={submitAttempted}
								/>

								<Divider />

								{/* Scan coordinate and atoms */}
								<Grid sx={{ mx: 2 }}>
									<MolmakerSectionHeader text="What do you want to scan?" sx={{ mb: 2 }} />
									<TextField
										select
										fullWidth
										label="Scan type"
										value={coordinate}
										onChange={(e) => {
											setCoordinate(e.target.value as ScanCoordinate);
										}}
									>
										{COORDINATE_OPTIONS.map((option) => (
											<MenuItem key={option.value} value={option.value}>
												{option.label}
											</MenuItem>
										))}
									</TextField>

									<Box display="flex" gap={2} sx={{ mt: 2 }}>
										{Array.from({ length: expectedAtomCount }, (_, slot) => (
											<MolmakerDropdown
												key={slot}
												label={SLOT_LABELS[coordinate][slot]}
												value={atomSlots[slot] ?? ""}
												onChange={(e) => handleAtomSlotChange(slot, e.target.value as number)}
												options={atomOptions
													// Hide atoms already taken by another slot, but keep this slot's own
													// pick so it still renders as the selected value.
													.filter(
														(a) => a.index === atomSlots[slot] || !parsedAtoms.includes(a.index),
													)
													.map((a) => ({ value: a.index, label: a.label }))}
												required
												disabled={atomOptions.length === 0}
												error={submitAttempted && !atomsValid}
											/>
										))}
									</Box>
									<FormHelperText sx={{ mt: 1 }}>
										{atomOptions.length === 0
											? "Upload or select a molecule to choose atoms."
											: `Numbers match the preview — tick "Show atom numbers" to see them.`}
										{currentValue !== null &&
											` Current value: ${formatMeasurement(coordinate, currentValue)}.`}
									</FormHelperText>

									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={showAtomNumbers}
												onChange={(e) => setShowAtomNumbers(e.target.checked)}
											/>
										}
										label="Show atom numbers in preview"
									/>
								</Grid>

								<Divider />

								{/* Range of values */}
								<Grid sx={{ mx: 2 }}>
									<MolmakerSectionHeader text="Range of values" sx={{ mb: 1 }} />
									<MolmakerRadioGroup
										name="rangeMode"
										value={rangeMode}
										onChange={(_event: unknown, val: string) => setRangeMode(val as RangeMode)}
										options={[
											{ value: "steps", label: "Number of steps" },
											{ value: "spacing", label: "Step size" },
											{ value: "values", label: "Specific values" },
										]}
										row
									/>

									{rangeMode !== "values" ? (
										<Box display="flex" gap={2} sx={{ mt: 2 }}>
											<MolmakerTextField
												label={`Minimum (${unitLabel})`}
												value={rangeMin}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setRangeMin(e.target.value)
												}
												required
											/>
											<MolmakerTextField
												label={`Maximum (${unitLabel})`}
												value={rangeMax}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setRangeMax(e.target.value)
												}
												required
											/>
											{rangeMode === "steps" ? (
												<MolmakerTextField
													label="Number of steps"
													value={rangeSteps}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRangeSteps(e.target.value)
													}
													required
												/>
											) : (
												<MolmakerTextField
													label={`Step size (${unitLabel})`}
													value={rangeSpacing}
													onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
														setRangeSpacing(e.target.value)
													}
													required
												/>
											)}
										</Box>
									) : (
										<MolmakerTextField
											label={`Values (${unitLabel})`}
											value={rangeValues}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setRangeValues(e.target.value)
											}
											required
											sx={{ mt: 2 }}
											helperText="Comma-separated, for example 23, 256, 300"
										/>
									)}
								</Grid>

								<Divider />

								{/* Calculation parameters */}
								<Box sx={{ mx: 2 }}>
									<Grid container direction={{ xs: "column", md: "row" }} spacing={2}>
										<Grid size={{ xs: 12, md: 6 }} sx={{ pr: { xs: 0, md: 3 } }}>
											<MolmakerSectionHeader text="What is the total charge?" sx={{ mb: 2 }} />
											<MolmakerTextField
												label="Charge"
												type="number"
												value={String(charge)}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setCharge(parseInt(e.target.value, 10) || 0)
												}
											/>
										</Grid>
										<Grid size={{ xs: 12, md: 6 }} sx={{ pr: { xs: 0, md: 3 } }}>
											<MolmakerSectionHeader
												text="How many unpaired electrons does this species have?"
												sx={{ mb: 1 }}
											/>
											<MolmakerRadioGroup
												name="unpairedElectrons"
												value={String(multiplicity)}
												onChange={(_event: unknown, val: string) =>
													setMultiplicity(parseInt(val, 10))
												}
												options={unpairedElectronOptions.map((o) => ({
													value: String(o.multiplicity),
													label: o.label,
												}))}
												row
											/>
										</Grid>
										<Grid size={{ xs: 12, md: 6 }} sx={{ pr: { xs: 0, md: 3 } }}>
											<MolmakerSectionHeader
												text="Relax the structure during the scan?"
												sx={{ mb: 1 }}
											/>
											<MolmakerRadioGroup
												name="relax"
												value={relax ? "yes" : "no"}
												onChange={(_event: unknown, val: string) => setRelax(val === "yes")}
												options={[
													{ value: "no", label: "No" },
													{ value: "yes", label: "Yes" },
												]}
												row
											/>
										</Grid>
									</Grid>
								</Box>

								{/* Submit button */}
								<Grid sx={{ mx: 2, mb: 3 }}>
									<Box display="flex" alignItems="center" gap={1}>
										<Button
											type="submit"
											variant="contained"
											size="large"
											startIcon={<PlayCircleOutlineOutlined />}
											fullWidth
											sx={{ textTransform: "none", borderRadius: 2 }}
										>
											Run Bond/Angle Scan
										</Button>
										<Tooltip title="This builds a structure at each value in the range and runs a molecular orbital calculation on it. With relaxation enabled, every structure is also minimised while the scanned coordinate is held fixed.">
											<IconButton>
												<InfoOutline />
											</IconButton>
										</Tooltip>
									</Box>
								</Grid>
							</Grid>
						</Box>
					</Paper>
				</Grid>

				<Grid
					size={{ xs: 12, md: 6 }}
					sx={{
						position: { md: "sticky" },
						top: { md: `${APP_BAR_HEIGHT + 16}px` },
					}}
				>
					<MolmakerMoleculePreview
						data={structureData}
						format="xyz"
						source={source}
						maxHeight={450}
						submitConfirmed={submitConfirmed}
						showAtomNumbers={showAtomNumbers}
						highlightAtoms={parsedAtoms}
						highlightKind={coordinate}
						setStructureImageData={setStructureImageData}
					/>
				</Grid>
			</Grid>
		</Box>
	);
}
