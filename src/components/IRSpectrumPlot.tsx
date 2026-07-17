import React, { useMemo } from "react";
import { Scatter } from "react-chartjs-2";
import {
	Chart as ChartJS,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	ScatterController,
	LineController,
	ChartData,
	ChartOptions,
    ChartDataset,
} from "chart.js";

// Register the Chart.js components needed for scatter and line charts.
ChartJS.register(
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	ScatterController,
	LineController,
);

/**
 * Props for the IRSpectrumPlot component.
 */
type Props = {
	data: { freq: number; intensity: number }[];
	width: number;
	shape: "gaussian" | "lorentzian";
};

/**
 * Renders an IR spectrum plot.
 *
 * The plot shows both the raw frequency/intensity peaks and a broadened
 * continuous spectrum generated using either a Gaussian or Lorentzian profile.
 */
const IRSpectrumPlot: React.FC<Props> = ({ data, width, shape }) => {
	// Separate frequency and intensity arrays for profile generation.
	const freqs = data.map((d) => d.freq);
	const intensities = data.map((d) => d.intensity);

	// Generate the smooth broadened spectrum only when inputs change.
	const profile = useMemo(
		() => generateProfile(freqs, intensities, width, shape),
		[freqs, intensities, width, shape],
	);

	// Chart.js dataset configuration for raw peaks and the generated profile curve.
	const chartData: ChartData<"scatter"> = {
		datasets: [
			{
				label: "Raw Peaks",
				data: data.map((d) => ({ x: d.freq, y: d.intensity })),
				pointRadius: 4,
				backgroundColor: "black",
			},
			{
				type: "line",
				label: `${shape} profile`,
				data: profile,
				borderColor: "red",
				borderWidth: 2,
				fill: false,
				pointRadius: 0,
				parsing: false,
			} as unknown as ChartDataset<"scatter">,
		],
	};

	// Chart.js display options, including axis ranges and labels.
	const options: ChartOptions<"scatter"> = {
		scales: {
			x: {
				type: "linear",
				min: Math.min(...freqs) - 3 * width,
				max: Math.max(...freqs) + 3 * width,
				title: {
					display: true,
					text: "Frequency (cm⁻¹)",
				},
			},
			y: {
				title: {
					display: true,
					text: "Intensity",
				},
			},
		},
		responsive: true,
	};

	return <Scatter data={chartData} options={options} />;
};

export default IRSpectrumPlot;

/**
 * Evaluate a Gaussian broadening function.
 *
 * @param x - Position where the function is evaluated.
 * @param mu - Peak center.
 * @param sigma - Gaussian width parameter.
 * @returns Gaussian profile value at `x`.
 */
function gaussian(x: number, mu: number, sigma: number) {
	return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
}

/**
 * Evaluate a Lorentzian broadening function.
 *
 * @param x - Position where the function is evaluated.
 * @param mu  - Peak center.
 * @param gamma - Lorentzian width parameter.
 * @returns Lorentzian profile value at `x`.
 */
function lorentzian(x: number, mu: number, gamma: number) {
	return gamma ** 2 / ((x - mu) ** 2 + gamma ** 2);
}

/**
 * Generate a smooth IR spectrum profile from discrete peak data.
 *
 * Each raw peak is broadened using either a Gaussian or Lorentzian function.
 * The final profile is the sum of all broadened peaks evaluated over a fixed
 * frequency grid.
 *
 * @param freqs - Peak center frequencies.
 * @param intensities - Peak intensities corresponding to each frequency.
 * @param width - Broadening width used by the selected profile function.
 * @param type - Profile function used for broadening.
 * @param resolution - Number of intervals used to sample the generated curve.
 * @returns Array of `{ x, y }` points for plotting the smooth profile.
 */
function generateProfile(
	freqs: number[],
	intensities: number[],
	width: number,
	type: "gaussian" | "lorentzian",
	resolution = 500,
) {
	// Extend the x-axis beyond the first and last peaks so tails are visible.
	const peakMargin = 3;

	const xMin = Math.min(...freqs) - peakMargin * width;
	const xMax = Math.max(...freqs) + peakMargin * width;
	const dx = (xMax - xMin) / resolution;

	// Frequency grid used to sample the broadened spectrum.
	const xs = Array.from({ length: resolution + 1 }, (_, i) => xMin + i * dx);

	// Sum the contribution of every broadened peak at each x-position.
	const curve = xs.map((x) =>
		intensities.reduce((sum, I, idx) => {
			const mu = freqs[idx];
			const f = type === "gaussian" ? I * gaussian(x, mu, width) : I * lorentzian(x, mu, width);
			return sum + f;
		}, 0),
	);

	// Convert the sampled curve into Chart.js-compatible points.
	return xs.map((x, i) => ({ x, y: curve[i] }));
}
