
export type Orbital = {
	energy: number;
	index: number;
	occupancy: number;
	spin: string;
	symmetry: string;
	type: string;
};

export interface JobError {
	id: string | null
	input_data: any
	success: boolean
	error: {
		error_type: string,
		error_message: string,
		extras: any
	}
	extras: any
}

export interface JobResult {
	jobId: string
	calculation: string
	status: string
	urls: { [key: string]: string }
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
}

export type Atom = {
	atomIndex: number;
	atomNo: number,
	bondCount: number;
	element: string;
	model: string;
	partialCharge: number;
	sym: string;
	x: number;
	y: number;
	z: number;
}