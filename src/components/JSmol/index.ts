import OrbitalViewer from "./OrbitalViewer";
import VibrationViewer from "./VibrationViewer";
import OptimizationViewer from "./OptimizationViewer";
import StandardAnalysisViewer from "./StandardAnalysisViewer";
import EnergyViewer from "./EnergyViewer";

/**
 * Re-export all result viewer components from this module.
 * 
 * Allowing other files to import multiple viewer components from
 * a single location.
 */
export {
	OrbitalViewer,
	VibrationViewer,
	OptimizationViewer,
	StandardAnalysisViewer,
	EnergyViewer,
};

/**
 * Extends the browser Window type to include the global Jmol object.
 */
declare global {
	interface Window {
		Jmol: any;
	}
}