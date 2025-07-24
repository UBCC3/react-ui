import React, {useMemo, useState} from 'react';
import { Scatter } from 'react-chartjs-2';
import {
	Chart,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	ChartData,
	ChartOptions
} from 'chart.js';

Chart.register(LinearScale, PointElement, LineElement, Tooltip);

type Props = {
	data: { freq: number; intensity: number }[];
	width: number;
	shape: 'gaussian' | 'lorentzian';
};

const IRSpectrumPlot: React.FC<Props> = ({
	data,
	width,
	shape
}) => {
	const freqs = data.map(d => d.freq);
	const intensities = data.map(d => d.intensity);

	const profile = useMemo(
		() => generateProfile(freqs, intensities, width, shape),
		[freqs, intensities, width, shape]
	);

	const chartData: ChartData<'scatter'> = {
		datasets: [
			{
				label: 'Raw Peaks',
				data: data.map(d => ({ x: d.freq, y: d.intensity })),
				pointRadius: 4,
				backgroundColor: 'black',
			},
			{
				type: 'line' as any,
				label: `${shape} profile`,
				data: profile,
				borderColor: 'red',
				borderWidth: 2,
				fill: false,
				pointRadius: 0,
				parsing: false,
			},
		],
	};

	const options:ChartOptions<'scatter'> = {
		scales: {
			x: {
                type: 'linear',
				min: Math.min(...freqs) - 3 * width,
				max: Math.max(...freqs) + 3 * width,
                title: {
                  display: true,
                  text: 'Frequency (cm⁻¹)',
                },
              },
			y: {
                title: {
                  display: true,
                  text: 'Intensity',
                },
            },
		},
		responsive: true,
	};

	return <Scatter data={chartData} options={options} />;
};

export default IRSpectrumPlot;

function gaussian(x: number, mu: number, sigma: number) {
	return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
}

function lorentzian(x: number, mu: number, gamma: number) {
	return gamma ** 2 / ((x - mu) ** 2 + gamma ** 2);
}

function generateProfile(
	freqs: number[],
	intensities: number[],
	width: number,
	type: 'gaussian' | 'lorentzian',
	resolution = 500
) {
	const peakMargin = 3;

	const xMin = Math.min(...freqs) - peakMargin * width;
	const xMax = Math.max(...freqs) + peakMargin * width;
	const dx = (xMax - xMin) / resolution;
	const xs = Array.from({ length: resolution + 1 }, (_, i) => xMin + i * dx);
	const curve = xs.map(x =>
		intensities.reduce((sum, I, idx) => {
			const mu = freqs[idx];
			const f = type === 'gaussian' ? I * gaussian(x, mu, width) : I * lorentzian(x, mu, width);
			return sum + f;
		}, 0)
	);
	return xs.map((x, i) => ({ x, y: curve[i] }));
}