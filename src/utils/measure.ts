export type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3) => Math.sqrt(dot(a, a));
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

export const centroid = (points: Vec3[]): Vec3 =>
	points
		.reduce<Vec3>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
		.map((c) => c / points.length) as Vec3;

export const measureBond = (a: Vec3, b: Vec3) => norm(sub(b, a));

export const measureAngle = (a: Vec3, b: Vec3, c: Vec3) => {
	const u = sub(a, b);
	const v = sub(c, b);
	const cosine = dot(u, v) / (norm(u) * norm(v));
	return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
};

/** Praxeolitic formulation: stable, and signed the same way optking reports it. */
export const measureDihedral = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
	const b0 = sub(a, b);
	const b2 = sub(d, c);
	let b1 = sub(c, b);
	b1 = scale(b1, 1 / norm(b1));

	const v = sub(b0, scale(b1, dot(b0, b1)));
	const w = sub(b2, scale(b1, dot(b2, b1)));

	return (Math.atan2(dot(cross(b1, v), w), dot(v, w)) * 180) / Math.PI;
};

export type MeasureKind = "bond" | "angle" | "dihedral";

/** Returns null unless the point count matches the coordinate. */
export const measureCoordinate = (kind: MeasureKind, points: Vec3[]): number | null => {
	if (kind === "bond" && points.length === 2) return measureBond(points[0], points[1]);
	if (kind === "angle" && points.length === 3) return measureAngle(points[0], points[1], points[2]);
	if (kind === "dihedral" && points.length === 4)
		return measureDihedral(points[0], points[1], points[2], points[3]);
	return null;
};

export const formatMeasurement = (kind: MeasureKind, value: number) =>
	kind === "bond" ? `${value.toFixed(3)} Å` : `${value.toFixed(1)}°`;
