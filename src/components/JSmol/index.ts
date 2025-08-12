import OrbitalViewer from "./OrbitalViewer";
import VibrationViewer from "./VibrationViewer";
import OptimizationViewer from "./OptimizationViewer";
import StandardAnalysisViewer from "./StandardAnalysisViewer";
import EnergyViewer from "./EnergyViewer";

export {
	OrbitalViewer,
	VibrationViewer,
	OptimizationViewer,
	StandardAnalysisViewer,
	EnergyViewer,
};

declare global {
	interface Window {
		Jmol: any;
	}
}