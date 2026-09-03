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
} from "../../components/custom";
import {
	getLibraryStructuresPaged,
	getStructureContent,
	AddAndUploadStructureToS3,
	getChemicalFormula,
	getMultiplicities,
	getStructuresTags,
	submitBondAngleScan,
} from "../../services/api";
import { Structure } from "../../types";
import { APP_BAR_HEIGHT } from "../../constants";
import { grey } from "@mui/material/colors";
import { parseXyzAtoms } from "../../utils";
import { useScanSpec } from "../../hooks/UseScanSpec";
import ScanSpecFields from "../../components/ScanSpecFields";

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
	const [multiplicities, setMultiplicities] = useState<Record<string, number>>({});

	// available tag options shown in the autocomplete input
	const [options, setOptions] = useState<string[]>([]);

	// structure preview snapshot confirm
	const [submitConfirmed, setSubmitConfirmed] = useState(false);
	const [structureImageData, setStructureImageData] = useState<string>("");

	// The scan specification and its validation are shared with the custom job
	// page; only the level of theory differs, and a workflow scan does not
	// expose one.
	const atomOptions = useMemo(() => parseXyzAtoms(structureData), [structureData]);
	const scan = useScanSpec(atomOptions);

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
				const response = await getLibraryStructuresPaged(token);
				if (response.error) {
					setError("Failed to fetch library. Please try again later.");
					return;
				}
				let res = response.data ?? [];
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

		const fetchMultiplicities = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getMultiplicities(token);
				if (response.error) {
					setError("Failed to load multiplicities. Please try again later.");
					return;
				}
				setMultiplicities(response.data ?? {});
			} catch (err) {
				setError("Failed to load multiplicities. Please try again later.");
				console.error("Failed to load multiplicities", err);
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
		fetchMultiplicities();
		fetchTags();
	}, [getAccessTokenSilently]);

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
			const response = await getStructureContent(structure_id, token);
			if (response.error) {
				setError("Failed to load structure. Please try again or select a different molecule.");
				return;
			}
			setStructureData(response.data ?? "");
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

		const scanError = scan.validateScan();
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
				scan: scan.buildScanSpec(),
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
			setError(
				err instanceof Error ? err.message : "Failed to submit job. Please try again later.",
			);
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

								<ScanSpecFields
									scan={scan}
									atomOptions={atomOptions}
									submitAttempted={submitAttempted}
									showAtomNumbers={showAtomNumbers}
									onShowAtomNumbersChange={setShowAtomNumbers}
								/>

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
												options={Object.entries(multiplicities).map(([label, value]) => ({
													value: String(value),
													label,
												}))}
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
						highlightAtoms={scan.parsedAtoms}
						highlightKind={scan.coordinate}
						setStructureImageData={setStructureImageData}
					/>
				</Grid>
			</Grid>
		</Box>
	);
}
