import React, { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider } from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import { blue } from "@mui/material/colors";
import { useAuth0 } from "@auth0/auth0-react";
import { MolmakerAlert, MolmakerTextField } from "./custom";
import { updateJob } from "../services/api";
import type { Job } from "../types";
import {
	createJobEditSnapshot,
	hasUncommittedTag,
	haveSameJobTags,
	shouldSeedJobEditDraft,
} from "../utils";
import type { JobEditSnapshot } from "../utils";
import JobTagsInput from "./JobTagsInput";

interface EditJobDialogProps {
	open: boolean;
	job: Job | null;
	availableTags: string[];
	onClose: () => void;
	onSaved: (updatedJob: Job) => void;
}

/**
 * Dialog for editing a job's user-editable metadata: name, notes, and tags.
 *
 * Status, runtime and calculation settings are backend-managed and not shown
 * here. Only changed fields are sent, because PATCH /jobs/{id} rejects a body
 * with nothing to update.
 */
const EditJobDialog = ({ open, job, availableTags, onClose, onSaved }: EditJobDialogProps) => {
	const { getAccessTokenSilently } = useAuth0();

	const [jobName, setJobName] = useState<string>("");
	const [jobNotes, setJobNotes] = useState<string>("");
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState<string>("");
	const [saveAttempted, setSaveAttempted] = useState<boolean>(false);
	const [saving, setSaving] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [snapshot, setSnapshot] = useState<JobEditSnapshot | null>(null);

	// Seed once per edit session. Polling replaces the job object, but must not
	// replace text or tags that the user is currently editing.
	useEffect(() => {
		if (!open) {
			setSnapshot(null);
			return;
		}
		if (!job || !shouldSeedJobEditDraft(open, snapshot?.jobId ?? null, job.job_id)) return;

		const nextSnapshot = createJobEditSnapshot(job);
		setSnapshot(nextSnapshot);
		setJobName(nextSnapshot.jobName);
		setJobNotes(nextSnapshot.jobNotes);
		setTags(nextSnapshot.tags);
		setTagInput("");
		setSaveAttempted(false);
		setError(null);
	}, [open, job, snapshot?.jobId]);

	const nameIsBlank = jobName.trim() === "";
	const hasPendingTag = hasUncommittedTag(tagInput);

	const hasChanges = useMemo(() => {
		if (!snapshot) return false;
		return (
			jobName.trim() !== snapshot.jobName ||
			jobNotes !== snapshot.jobNotes ||
			!haveSameJobTags(tags, snapshot.tags)
		);
	}, [snapshot, jobName, jobNotes, tags]);

	const handleSave = async () => {
		if (!job || !snapshot || nameIsBlank) return;
		setSaveAttempted(true);
		if (hasPendingTag || !hasChanges) return;

		const fields: {
			job_name?: string;
			job_notes?: string;
			tags?: string[];
			replace_tags?: boolean;
		} = {};

		if (jobName.trim() !== snapshot.jobName) fields.job_name = jobName.trim();
		// An empty string clears the notes; omitting the field leaves them alone.
		if (jobNotes !== snapshot.jobNotes) fields.job_notes = jobNotes;
		if (!haveSameJobTags(tags, snapshot.tags)) {
			// replace_tags makes this dialog authoritative, so removals stick.
			// The backend requires tags alongside it.
			fields.tags = tags;
			fields.replace_tags = true;
		}

		setSaving(true);
		setError(null);
		try {
			const token = await getAccessTokenSilently();
			const response = await updateJob(job.job_id, token, fields);
			if (response.error) {
				setError(response.error);
				return;
			}
			onSaved(response.data as Job);
			onClose();
		} catch (err) {
			setError("Failed to save changes. Please try again.");
			console.error("Failed to update the job", err);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
			<DialogTitle sx={{ display: "flex", alignItems: "center" }}>
				<EditOutlined sx={{ mr: 1, color: blue[600] }} />
				Edit Job Details
			</DialogTitle>
			<Divider />
			<DialogContent sx={{ display: "flex", flexDirection: "column", p: 2 }}>
				{error && <MolmakerAlert text={error} severity="error" outline="error" />}
				<MolmakerTextField
					label="Job Name"
					value={jobName}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobName(e.target.value)}
					required
					error={nameIsBlank}
					helperText={nameIsBlank ? "Job name cannot be empty" : ""}
					sx={{ mt: 1 }}
				/>
				<MolmakerTextField
					label="Job Notes"
					value={jobNotes}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobNotes(e.target.value)}
					multiline
					rows={3}
					helperText="Leave empty to clear the notes."
					sx={{ mt: 2 }}
				/>
				<JobTagsInput
					options={availableTags}
					value={tags}
					inputValue={tagInput}
					disablePortal
					onChange={setTags}
					onInputChange={setTagInput}
					showUncommittedWarning={saveAttempted && hasPendingTag}
					sx={{ mt: 2 }}
				/>
			</DialogContent>
			<DialogActions sx={{ pr: 2, pb: 2 }}>
				<Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
					Cancel
				</Button>
				<Button
					variant="contained"
					onClick={handleSave}
					disabled={saving || (!hasChanges && !hasPendingTag) || nameIsBlank}
					sx={{ textTransform: "none" }}
				>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default EditJobDialog;
