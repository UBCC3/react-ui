
export type Orbital = {
	energy: number;
	index: number;
	occupancy: number;
	spin: string;
	symmetry: string;
	type: string;
};

export interface JobResult {
	jobId: string
	calculation: string
	status: string
	urls: { [key: string]: string }
}

export type VibrationMode = {
	index: number;
	frequencyCM: number;
	irIntensity: number;
	symmetry: string;
	forceConstant: number;
	charTemp: number;
};

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