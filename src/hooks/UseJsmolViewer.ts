import { useEffect, useRef, useState } from "react";

/**
 * JSmol posts to this host for the few operations it cannot do in the browser.
 * It is a third-party service we do not control, so it is overridable through
 * the environment; the long-term fix is to proxy it from our own backend.
 */
const JSMOL_SERVER_URL =
	import.meta.env.VITE_JSMOL_SERVER_URL || "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php";

interface UseJsmolViewerOptions {
	viewerObjId: string;
	/**
	 * File URL(s) passed as the JSmol "src" (used for applet identity in the effect deps)
	 */
	src: string;
	/**
	 * The "load ..." script passed to the JSmol Info.script field
	 */
	loadScript: string;
	/**
	 * Extra script run once the applet reports ready (e.g. "zoom 50; connect auto;")
	 */
	onReadyScript?: string;
	/**
	 * Skip (re-)initializing the applet, e.g. while results are still loading or an inactive tab is shown
	 */
	skip?: boolean;
	/**
	 * If true, tears the applet down (stop/clear) whenever deps change or the
	 * component unmounts. Needed by viewers that swap between tabs/frames
	 * (e.g. VibrationViewer's structure/graph tabs) so a stale applet isn't
	 * left running in the background.
	 */
	cleanupOnChange?: boolean;
	onReady?: (viewerObj: any) => void;
}

/**
 * Initializes a JSmol applet inside a container div and exposes the
 * resulting viewer object once ready.
 *
 * Encapsulates the applet bootstrapping boilerplate (Info config, applet
 * mount, ready callback, optional teardown) that was previously duplicated
 * near-verbatim across EnergyViewer, OptimizationViewer, OrbitalViewer, and
 * VibrationViewer.
 */
export function useJsmolViewer({
	viewerObjId,
	src,
	loadScript,
	onReadyScript,
	skip = false,
	cleanupOnChange = false,
	onReady,
}: UseJsmolViewerOptions) {
	const viewerRef = useRef<HTMLDivElement>(null);
	const appletRef = useRef<any>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);

	useEffect(() => {
		if (skip) return;
		if (!viewerRef.current) return;

		const jsmolIsReady = (obj: any) => {
			appletRef.current = obj;
			if (onReadyScript) window.Jmol.script(obj, onReadyScript);
			setViewerObj(obj);
			onReady?.(obj);
		};

		const Info = {
			color: "#FFFFFF",
			width: "100%",
			height: "100%",
			use: "HTML5",
			j2sPath: `${import.meta.env.BASE_URL}jsmol/j2s`,
			src,
			serverURL: JSMOL_SERVER_URL,
			script: loadScript,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
		};

		window.Jmol.getApplet(viewerObjId, Info);
		viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);

		if (!cleanupOnChange) return;

		return () => {
			try {
				if (appletRef.current) {
					window.Jmol.script(
						appletRef.current,
						`!exit; spin off; animation off; set refreshing off;`,
					);
				}
			} catch {
				// Ignore Jmol script errors during cleanup; teardown below runs regardless.
			}
			if (viewerRef.current) viewerRef.current.innerHTML = "";
			appletRef.current = null;
			setViewerObj(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [viewerObjId, src, loadScript, skip, cleanupOnChange]);

	return { viewerRef, viewerObj, setViewerObj, appletRef };
}
