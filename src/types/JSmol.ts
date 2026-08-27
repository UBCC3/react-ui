export type Orbital = {
	energy: number;
	index: number;
	occupancy: number;
	spin: string;
	symmetry: string;
	type: string;
};

export interface JobError {
	id: string | null;
	input_data: any;
	success: boolean;
	error: {
		error_type: string;
		error_message: string;
		extras: any;
	};
	extras: any;
}

/**
 * Artifact kinds the backend can serve from /jobs/{job_id}/artifacts/{kind}.
 * Mirrors ARTIFACT_FILES in the backend's asset_service.py.
 */
export type JobArtifactKind = "input" | "trajectory" | "vib" | "molden" | "esp" | "scan";

/** Payload of GET /jobs/{job_id}/result. */
export interface JobResultPayload {
	job_id: string;
	result: any | null;
	error: JobError | null;
}

/** Payload of GET /jobs/{job_id}/artifacts. */
export interface JobArtifactListPayload {
	job_id: string;
	artifacts: JobArtifactKind[];
}

/**
 * Identifies the finished job a result viewer is showing. Viewers fetch the
 * result and any artifacts themselves using `jobId`; there are no longer
 * presigned URLs to pass down.
 */
export interface JobResult {
	jobId: string;
	calculation: string;
	status: string;
}

export type VibrationMode = {
	index: number;
	frequencyCM: ComplexNumber;
	irIntensity: number;
	symmetry: string;
	forceConstant: number;
	charTemp: number;
};

export type ComplexNumber = {
	real: number;
	imag: number;
};

export type Atom = {
	atomIndex: number;
	atomNo: number;
	bondCount: number;
	element: string;
	model: string;
	partialCharge: number;
	sym: string;
	x: number;
	y: number;
	z: number;
};
