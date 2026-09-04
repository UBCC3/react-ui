import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let presentation;
let tagInput;
let jobEditDraft;
let jobsTableState;

before(async () => {
	server = await createServer({
		configFile: false,
		server: { middlewareMode: true, hmr: false },
		appType: "custom",
		optimizeDeps: { noDiscovery: true },
	});
	presentation = await server.ssrLoadModule("/src/utils/jobPresentation.ts");
	tagInput = await server.ssrLoadModule("/src/utils/tagInput.ts");
	jobEditDraft = await server.ssrLoadModule("/src/utils/jobEditDraft.ts");
	jobsTableState = await server.ssrLoadModule("/src/utils/jobsTableState.ts");
});

after(async () => {
	await server.close();
});

test("formats scan and unknown calculation types without an empty label", () => {
	assert.equal(presentation.formatCalculationType("scan"), "Bond/Angle Scan");
	assert.equal(presentation.formatCalculationType("future_calculation"), "Future Calculation");
});

test("enables archive downloads only for a recorded uploaded archive", () => {
	assert.equal(
		presentation.isJobArchiveAvailable({
			archive_uploaded: true,
			archive_upload_status: "uploaded",
		}),
		true,
	);
	assert.equal(
		presentation.isJobArchiveAvailable({
			archive_uploaded: false,
			archive_upload_status: "unavailable",
		}),
		false,
	);
});

test("shows cancellation requests only while the job is non-terminal", () => {
	assert.equal(
		presentation.hasPendingCancellation({ cancel_requested: true, status: "running" }),
		true,
	);
	assert.equal(
		presentation.hasPendingCancellation({ cancel_requested: true, status: "cancelled" }),
		false,
	);
});

test("detects only non-whitespace uncommitted tag text", () => {
	assert.equal(tagInput.hasUncommittedTag("draft"), true);
	assert.equal(tagInput.hasUncommittedTag("   "), false);
});

test("does not reseed an open edit draft when polling returns the same job", () => {
	assert.equal(jobEditDraft.shouldSeedJobEditDraft(true, "job-1", "job-1"), false);
	assert.equal(jobEditDraft.shouldSeedJobEditDraft(true, "job-1", "job-2"), true);
	assert.equal(jobEditDraft.shouldSeedJobEditDraft(false, null, "job-1"), false);
});

test("shows loading instead of an empty state until jobs finish loading", () => {
	assert.equal(jobsTableState.getJobsTableContentState(true, 0), "loading");
	assert.equal(jobsTableState.getJobsTableContentState(false, 0), "empty");
	assert.equal(jobsTableState.getJobsTableContentState(true, 5), "ready");
});
