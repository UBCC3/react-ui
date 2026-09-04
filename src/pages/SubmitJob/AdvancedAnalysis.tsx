import { useState, useEffect, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import {
	Box,
	Grid,
	Divider,
	Button,
	Paper,
	Accordion,
	AccordionSummary,
	AccordionDetails,
} from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	MolmakerPageTitle,
	MolmakerTextField,
	MolmakerDropdown,
	MolmakerMoleculeSelector,
	MolmakerSectionHeader,
	MolmakerRadioGroup,
	MolmakerMoleculePreview,
	MolmakerAlert,
	MolmakerLoading,
	MolmakerConfirm,
} from "../../components/custom";
import {
	getCalculationTypes,
	getLibraryStructuresPaged,
	getStructureContent,
	getWavefunctionMethods,
	getDensityFunctionalMethods,
	getBasisSets,
	getMultiplicities,
	AddAndUploadStructureToS3,
	getStructuresTags,
	submitCustomCalculation,
} from "../../services/api";
import { Structure } from "../../types";
import { getChemicalFormula } from "../../services/api";
import { APP_BAR_HEIGHT } from "../../constants";
import { useScanSpec } from "../../hooks/UseScanSpec";
import ScanSpecFields from "../../components/ScanSpecFields";
import { parseXyzAtoms } from "../../utils/parseXyz";
import * as React from "react";
import { Keyword, KeywordEditor } from "./KeywordEditor";
import { grey } from "@mui/material/colors";
import JobTagsInput from "../../components/JobTagsInput";
import { hasUncommittedTag } from "../../utils";
import { getErrorMessage } from "../../utils/errorMessage";

/**
 * AdvancedAnalysis renders the advanced job submission page.
 *
 * This page lets the user:
 * - upload a molecule file or select one from the library,
 * - configure calculation settings,
 * - add optional calculation keywords,
 * - optionally save an uploaded molecule to the library,
 * - submit the advanced analysis job to the backend.
 */
const AdvancedAnalysis = () => {
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
	const [jobTagInput, setJobTagInput] = useState<string>("");

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
	const [calculationType, setCalculationType] = useState<string>("energy");

	// Scan is the one calculation type that needs a specification beyond the
	// level of theory. The fields only render when it is selected.
	const atomOptions = useMemo(() => parseXyzAtoms(structureData), [structureData]);
	const scan = useScanSpec(atomOptions);
	const isScan = calculationType === "scan";

	const [multiplicity, setMultiplicity] = useState<number>(1);
	// Unpaired electron count mapped to spin multiplicity, from /enums/multiplicities.
	const [multiplicities, setMultiplicities] = useState<Record<string, number>>({});
	const [theoryType, setTheoryType] = useState("wavefunction");
	const [theory, setTheory] = useState<string>("scf");
	const [basisSet, setBasisSet] = useState<string>("sto-3g");

	// existing tag options shown in the tag autocomplete fields
	const [options, setOptions] = useState<string[]>([]);

	// dropdown options state
	const [wavefunctionTheory, setWavefunctionTheory] = useState<{ [key: string]: string }>({});
	const [densityTheory, setDensityTheory] = useState<string[]>([]);
	const [calculationTypes, setCalculationTypes] = useState<Record<string, string>>({});
	const [basisSets, setBasisSets] = useState<{ [key: string]: string }>({});

	// structure preview snapshot confirm
	const [openConfirmImage, setOpenConfirmImage] = useState<boolean>(false);
	const [submitConfirmed, setSubmitConfirmed] = useState<boolean>(false);
	const [structureImageData, setStructureImageData] = useState<string>("");

	// keywords (optional)
	const [keywords, setKeywords] = useState<Keyword[]>([]);

	/**
	 * Updates the keyword list when the KeywordEditor changes.
	 */
	const handleKeywordsChange = (updatedKeywords: Keyword[]) => {
		setKeywords(updatedKeywords);
	};

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

	// Load library on mount
	useEffect(() => {
		// Load dropdown options
		const loadDropdownOptions = async () => {
			try {
				const token = await getAccessTokenSilently();
				let response = await getCalculationTypes(token);
				if (response.error) {
					setError("Failed to load calculation types. Please try again later.");
					return;
				}
				setCalculationTypes(response.data ?? {});
				response = await getWavefunctionMethods(token);
				if (response.error) {
					setError("Failed to load wavefunction methods. Please try again later.");
					return;
				}
				setWavefunctionTheory(response.data ?? {});
				response = await getDensityFunctionalMethods(token);
				if (response.error) {
					setError("Failed to load density functional methods. Please try again later.");
					return;
				}
				setDensityTheory(response.data ?? []);
				response = await getBasisSets(token);
				if (response.error) {
					setError("Failed to load basis sets. Please try again later.");
					return;
				}
				setBasisSets(response.data ?? {});
				response = await getMultiplicities(token);
				if (response.error) {
					setError("Failed to load multiplicities. Please try again later.");
					return;
				}
				setMultiplicities(response.data ?? {});
			} catch (err) {
				setError("Failed to load calculation types. Please try again later.");
				console.error("Failed to load calculation types", err);
			} finally {
				setLoading(false);
			}
		};

		/**
		 * Loads structures from the user's library for the molecule selector.
		 */
		const loadLibrary = async () => {
			try {
				const token = await getAccessTokenSilently();
				const response = await getLibraryStructuresPaged(token);
				if (response.error) {
					setError("Failed to fetch library. Please try again later.");
					return;
				}
				let structures = response.data;
				structures = [
					{
						structure_id: "",
						name: "Select a molecule",
						user_sub: "",
						location: "",
					},
					...structures,
				];
				setStructures(structures);
			} catch (err) {
				setError("Failed to fetch library. Please try again later.");
				console.error("Failed to fetch library", err);
			} finally {
				setLoading(false);
			}
		};

		/**
		 * Fetches existing structure tags so the autocomplete can suggest them.
		 */
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
		loadDropdownOptions();
		loadLibrary();
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

	// Library select change
	const handleLibrarySelect = async (selected_structure_id: string) => {
		setSelectedStructure(selected_structure_id);
		setFile(null);
		setUploadStructure(false);
		setStructureData("");
		setError(null);

		if (selected_structure_id) {
			try {
				const token = await getAccessTokenSilently();
				const response = await getStructureContent(selected_structure_id, token);
				if (response.error) {
					setError("Failed to load structure. Please try again or select a different molecule.");
					return;
				}
				setStructureData(response.data ?? "");
			} catch (err) {
				setError("Failed to load structure. Please try again or select a different molecule.");
				console.error("Failed to load structure", err);
			}
		}
	};

	/**
	 * Handles uploaded molecule files.
	 */
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

	/**
	 * Submit sthe advanced analysis job.
	 *
	 * This function:
	 * 1. validates all required fields,
	 * 2. prepares a file from either upload or library structure data,
	 * 3. creates an optional keywords JSON file,
	 * 4. submits the calculation request,
	 * 5. optionally saves the uploaded molecule to the library,
	 * 6. creates the job record in the app database,
	 * 7. redirects back to the jobs page.
	 */
	async function performSubmitJob(): Promise<void> {
		setSubmitAttempted(true);
		setError(null);
		if (hasUncommittedTag(jobTagInput)) return;

		let structureIdToUse = selectedStructure;
		const uploadFile = file;

		// Validate required calculation and molecule fields.
		if (!jobName || !structureData || !theory || !calculationType || !basisSet || !multiplicity) {
			setError("Please fill in all required fields");
			return;
		}
		if (source === "upload" && !uploadFile) {
			setError("Please upload a file");
			return;
		}
		if (isScan) {
			const scanError = scan.validateScan();
			if (scanError) {
				setError(scanError);
				return;
			}
		}
		if (source === "library" && !structureIdToUse) {
			setError("Please select a molecule from the library");
			return;
		}

		// Custom keywords travel as a JSON file alongside the calculation.
		let keywordsJsonFile: File | undefined = undefined;
		// A scan sends its specification through the same keywords file the
		// cluster already stages, so no extra transport is needed.
		if (keywords.length > 0 || isScan) {
			const payload = keywords.reduce<Record<string, any>>((obj, { key, value }) => {
				obj[key] = value;
				return obj;
			}, {});
			if (isScan) Object.assign(payload, scan.buildScanSpec());
			const keywordsBlob = new Blob([JSON.stringify(payload)], {
				type: "application/json",
			});
			keywordsJsonFile = new File([keywordsBlob], `keywords.json`, {
				type: "application/json",
			});
		}

		setLoading(true);
		try {
			const token = await getAccessTokenSilently();

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
					setError(structureResponse.error);
					return;
				}
				structureIdToUse = structureResponse.data.structure_id;
			}

			// One call creates the job and hands it to the backend orchestrator
			const response = await submitCustomCalculation(token, {
				file: source === "upload" && uploadFile ? uploadFile : undefined,
				structureId: source === "library" ? structureIdToUse : undefined,
				calculationType,
				method: theory,
				basisSet,
				charge,
				multiplicity,
				keywords: keywordsJsonFile,
				jobName,
				jobNotes: jobNotes ?? undefined,
				tags: jobTags,
			});
			if (response.error) {
				setError(response.error);
				return;
			}

			// Job submitted successfully, redirect to job list
			setSubmitAttempted(false);
			navigate("/");
		} catch (err) {
			setError(getErrorMessage(err, "Failed to submit job. Please try again later."));
			console.error("Failed to submit job", err);
		} finally {
			setLoading(false);
		}
	}

	/**
	 * Handles the form submit event.
	 */
	const handleSubmitJob = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitAttempted(true);
		if (hasUncommittedTag(jobTagInput)) return;
		if (uploadStructure && source === "upload") {
			setOpenConfirmImage(true);
			return;
		}

		performSubmitJob();
	};

	// Show the full loading screen while the page is fetching initial data or submitting.
	if (loading) {
		return <MolmakerLoading />;
	}

	return (
		<Box p={4} className="bg-stone-100 min-h-screen">
			<MolmakerConfirm
				open={openConfirmImage}
				onClose={() => setOpenConfirmImage(false)}
				textToShow={
					<>
						Confirm the current zoom and orientation to capture the structure image.
						<br />
						This view will be captured and saved as the snapshot for this structure.
						<br />
						You can scroll to zoom and drag to rotate the molecule before confirming.
					</>
				}
				onConfirm={async () => {
					setSubmitConfirmed(true);
					setOpenConfirmImage(false);
				}}
			/>
			<MolmakerPageTitle title="Custom Job" subtitle="Submit a custom job for a molecule" />
			<Grid container spacing={3} alignItems="flex-start">
				<Grid size={{ xs: 12, md: 6 }}>
					<Paper elevation={3} sx={{ borderRadius: 2, bgcolor: grey[50] }}>
						<Box component="form" onSubmit={handleSubmitJob}>
							<Grid container direction="column" spacing={2}>
								{/* Error message */}
								{error && <MolmakerAlert text={error} severity="error" outline="error" />}
								{/* required info */}
								<Grid sx={{ mx: 2, mt: 3 }}>
									<MolmakerSectionHeader text="Required fields are marked with *" />
								</Grid>
								{/* Job name */}
								<Grid sx={{ mx: 2 }}>
									<MolmakerTextField
										label="Job Name"
										value={jobName}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setJobName(e.target.value)
										}
										required
										error={submitAttempted && !jobName}
										helperText={submitAttempted && !jobName ? "Please enter a job name" : undefined}
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
									<JobTagsInput
										options={options}
										value={jobTags}
										inputValue={jobTagInput}
										onChange={setJobTags}
										onInputChange={setJobTagInput}
										showUncommittedWarning={submitAttempted && hasUncommittedTag(jobTagInput)}
										sx={{ mt: 2 }}
									/>
								</Grid>
								<Divider />
								{/* Molecule source */}
								<MolmakerMoleculeSelector
									source={source}
									onSourceChange={handleSourceChange}
									structures={structures}
									selectedStructure={selectedStructure}
									onLibrarySelect={handleLibrarySelect}
									file={file}
									onFileChange={(data: string, file: File) => {
										handleFileChange(data, file);
									}}
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
									submitAttempted={submitAttempted}
									structureTags={structureTags}
									onStructureTagsChange={(_event, newValue) => {
										setStructureTags(newValue.filter((tag) => tag.trim() !== ""));
									}}
								/>
								<Divider />
								{/* Theory */}
								<Box sx={{ mx: 2 }}>
									<Grid>
										<MolmakerSectionHeader text="Theory" sx={{ fontWeight: "bold", mb: 1 }} />
									</Grid>
									<Grid sx={{ mb: 1 }}>
										<MolmakerRadioGroup
											name="theoryType"
											value={theoryType}
											onChange={(_event: unknown, theory: string) => {
												setTheoryType(theory);
												if (theory === "density") {
													setTheory(densityTheory[0].toLowerCase());
												} else {
													setTheory(Object.values(wavefunctionTheory)[0]);
												}
											}}
											options={[
												{ value: "wavefunction", label: "Wavefunction Theory" },
												{ value: "density", label: "Density Functional Theory" },
											]}
											row
										/>
									</Grid>
									<Grid>
										<MolmakerDropdown
											label="Theory Method"
											value={theory}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setTheory(e.target.value)
											}
											options={
												theoryType === "density"
													? densityTheory.map((theory) => ({
															label: theory,
															value: theory.toLowerCase(),
														}))
													: Object.entries(wavefunctionTheory).map(([key, value]) => ({
															label: key,
															value: value,
														}))
											}
											helperText={
												submitAttempted && !theory ? "Please select a theory method" : undefined
											}
											error={submitAttempted && !theory}
											required
										/>
									</Grid>
								</Box>
								<Divider />
								{/* Calculation parameters */}
								<Box sx={{ mx: 2 }}>
									<Grid>
										<MolmakerSectionHeader
											text="Calculation Parameters"
											sx={{ fontWeight: "bold", mb: 3 }}
										/>
									</Grid>
									<Grid container spacing={2} sx={{ my: 2 }}>
										<Grid size={{ xs: 12, md: 6 }}>
											<MolmakerDropdown
												label="Calculation Type"
												value={calculationType}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setCalculationType(e.target.value)
												}
												options={Object.entries(calculationTypes).map(([key, value]) => ({
													label: key,
													value: value,
												}))}
												helperText={
													submitAttempted && !calculationType
														? "Please select a calculation type"
														: undefined
												}
												error={submitAttempted && !calculationType}
												required
											/>
										</Grid>
										<Grid size={{ xs: 12, md: 6 }}>
											<MolmakerDropdown
												label="Basis Set"
												value={basisSet}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setBasisSet(e.target.value)
												}
												options={Object.entries(basisSets).map(([key, value]) => ({
													label: key,
													value: value,
												}))}
												helperText={
													submitAttempted && !basisSet ? "Please select a basis set" : undefined
												}
												error={submitAttempted && !basisSet}
												required
											/>
										</Grid>
									</Grid>
									<Grid container spacing={2}>
										<Grid size={12}>
											<MolmakerTextField
												fullWidth
												label="Charge"
												type="number"
												value={charge}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
													const val = e.target.value;
													if (/^-?\d*$/.test(val)) {
														setCharge(parseInt(val));
													}
												}}
												required
											/>
										</Grid>
										<Grid size={12}>
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

								{/* Scan specification, only for scan calculations. */}
								{isScan && (
									<>
										<Divider />
										<ScanSpecFields
											scan={scan}
											atomOptions={atomOptions}
											submitAttempted={submitAttempted}
											showAtomNumbers={showAtomNumbers}
											onShowAtomNumbersChange={setShowAtomNumbers}
										/>
									</>
								)}

								{/* Calculation Keywords */}
								<Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", px: 2 }}>
									<AccordionSummary
										expandIcon={<ExpandMoreIcon />}
										aria-controls="keywords-content"
										id="keywords-header"
										sx={{
											px: 0,
											mx: 0,
											mt: 0.5,
											width: "100%",
										}}
									>
										<MolmakerSectionHeader
											text="Calculation Keywords"
											sx={{ fontWeight: "bold" }}
										/>
									</AccordionSummary>
									<AccordionDetails
										sx={{
											p: 2,
											borderRadius: 2,
											width: "100%",
											bgcolor: grey[200],
										}}
									>
										<KeywordEditor maxEntries={20} onChange={handleKeywordsChange} />
									</AccordionDetails>
								</Accordion>
								<Grid sx={{ mx: 2, mb: 3 }}>
									<Button
										type="submit"
										variant="contained"
										color="primary"
										size="large"
										startIcon={<PlayCircleOutlineIcon />}
										fullWidth
										sx={{ flexGrow: 1, textTransform: "none", borderRadius: 2 }}
									>
										Run Custom Job
									</Button>
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
						maxHeight={437}
						submitConfirmed={submitConfirmed}
						showAtomNumbers={isScan && showAtomNumbers}
						highlightAtoms={isScan ? scan.parsedAtoms : []}
						highlightKind={scan.coordinate}
						setStructureImageData={setStructureImageData}
					/>
				</Grid>
			</Grid>
		</Box>
	);
};

export default AdvancedAnalysis;
