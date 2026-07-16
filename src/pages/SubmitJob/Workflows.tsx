import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Collapse, Grid, Button, IconButton } from "@mui/material";
import { ExpandMore, ExpandLess, ArrowForward, AutoMode } from "@mui/icons-material";
import { MolmakerSectionHeader, MolmakerPageTitle } from "../../components/custom";
import { grey, blue } from "@mui/material/colors";

/**
 * Describes a single workflow option shown on the Workflows landing page.
 *
 * 'path' is only used when the workflow is enabled; disable workdlows
 * are shown as "Coming soon" and cannot be expanded or navigated to.
 */
interface WorkflowOption {
	id: string;
	title: string;
	subtitle: string;
	description: string;
	path?: string;
	enabled: boolean;
}

// Workflow catalog. Add new entries here as more workflows are implemented;
// each disabled entry renders as a "Coming soon" placeholder card.
const WORKFLOWS: WorkflowOption[] = [
	{
		id: "standard-analysis",
		title: "Standard Analysis",
		subtitle: "Optimization, frequency, and orbital analysis in one run.",
		description:
			"Standard analysis takes a structure and first performs a geometry " +
			"optimization calculation, followed by a vibrational and molecular " +
			"orbital analysis. This can be performed on a ground state structure " +
			"or a candidate transition state structure. The results of this " +
			"analysis contain optimized bond lengths and angles, vibrational " +
			"frequencies, predicted infrared spectra, thermodynamic quantities, " +
			"molecular orbital energies and other electronic properties.",
		path: "/workflows/standard-analysis",
		enabled: true,
	},
];

export default function Workflows() {
	const navigate = useNavigate();

	// Tracks which workflow card is currently expanded. Only one card
	// is expanded at a time; null means all cards are collapsed.
	const [expandedId, setExpandedId] = useState<string | null>("standard-analysis");

	// Toggles a card open/closed. Disabled workflows never expand.
	const handleToggleExpand = (workflow: WorkflowOption) => {
		if (!workflow.enabled) return;

		if (expandedId === workflow.id) {
			setExpandedId(null);
		} else {
			setExpandedId(workflow.id);
		}
	};

	// Navigates into the selected workflow's submission page.
	const handleOpenWorkflow = (workflow: WorkflowOption) => {
		if (!workflow.enabled || !workflow.path) return;
		navigate(workflow.path);
	};

	return (
		<Box p={4} className="bg-stone-100" sx={{ minHeight: `calc(100vh - 64px)` }}>
			<MolmakerPageTitle title="Submit Workflow Job" subtitle="Choose a workflow to get started" />
			<Grid container spacing={3} sx={{ mt: 1 }}>
				<Grid size={{ xs: 12 }}>
					<Box sx={{ mb: 1 }}>
						<MolmakerSectionHeader text="What are workflows?" sx={{ fontWeight: "bold", mb: 1 }} />
						<p style={{ margin: 0, color: grey[700], lineHeight: 1.6 }}>
							Workflows are series of calculations that perform common tasks, packaged into a simply
							called directive. Select a workflow below to see what it does, then continue into the
							submission page to set up your job.
						</p>
					</Box>
				</Grid>
				{WORKFLOWS.map((workflow) => {
					const isExpanded = expandedId === workflow.id;

					return (
						<Grid size={{ xs: 12 }} key={workflow.id}>
							<Paper
								elevation={workflow.enabled ? 3 : 0}
								sx={{
									borderRadius: 2,
									bgcolor: workflow.enabled ? grey[50] : grey[100],
									opacity: workflow.enabled ? 1 : 0.65,
									px: 3,
									py: 2,
								}}
							>
								<Box
									onClick={() => handleToggleExpand(workflow)}
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										cursor: workflow.enabled ? "pointer" : "default",
									}}
								>
									<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
										<AutoMode sx={{ color: workflow.enabled ? blue[600] : grey[500] }} />
										<Box>
											<p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
												{workflow.title}
											</p>
											<p style={{ margin: 0, fontSize: "0.85rem", color: grey[600] }}>
												{workflow.enabled ? workflow.subtitle : "Coming soon"}
											</p>
										</Box>
									</Box>
									{workflow.enabled && (
										<IconButton
											size="small"
											onClick={(e) => {
												e.stopPropagation();
												handleToggleExpand(workflow);
											}}
										>
											{isExpanded ? <ExpandLess /> : <ExpandMore />}
										</IconButton>
									)}
								</Box>
								{workflow.enabled && (
									<Collapse in={isExpanded} timeout="auto" unmountOnExit>
										<Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
											<p
												style={{ margin: 0, color: grey[700], lineHeight: 1.6, fontSize: "0.9rem" }}
											>
												{workflow.description}
											</p>
											<Button
												variant="contained"
												endIcon={<ArrowForward />}
												sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}
												onClick={() => handleOpenWorkflow(workflow)}
											>
												Open {workflow.title}
											</Button>
										</Box>
									</Collapse>
								)}
							</Paper>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
}
