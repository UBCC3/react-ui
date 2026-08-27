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
	 * Extra script run once the applet is ready and expected model loads complete.
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
	/**
	 * Number of successful file-load callbacks required before exposing the
	 * viewer object. Inline `load DATA` blocks each produce one callback.
	 */
	expectedLoadCount?: number;
	/** Report a failed or timed-out JSmol model load to the owning viewer. */
	onLoadError?: (message: string) => void;
	onReady?: (viewerObj: any) => void;
}

const JSMOL_LOAD_TIMEOUT_MS = 30_000;

/**
 * Initializes a JSmol applet inside a container div and exposes the
 * resulting viewer object once ready and its expected model loads complete.
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
	expectedLoadCount = 0,
	onLoadError,
	onReady,
}: UseJsmolViewerOptions) {
	const viewerRef = useRef<HTMLDivElement>(null);
	const appletRef = useRef<any>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);
	const onLoadErrorRef = useRef(onLoadError);
	const onReadyRef = useRef(onReady);

	onLoadErrorRef.current = onLoadError;
	onReadyRef.current = onReady;

	useEffect(() => {
		if (skip) return;
		if (!viewerRef.current) return;

		let cancelled = false;
		let loadFinished = false;
		let readyViewerObj: any = null;
		let successfulLoadCount = 0;
		let loadTimeoutId: ReturnType<typeof setTimeout> | null = null;

		const clearLoadTimeout = () => {
			if (loadTimeoutId !== null) clearTimeout(loadTimeoutId);
			loadTimeoutId = null;
		};

		const reportLoadFailure = (message: string) => {
			if (cancelled || loadFinished) return;
			loadFinished = true;
			clearLoadTimeout();
			setViewerObj(null);
			onLoadErrorRef.current?.(message);
		};

		const publishViewerWhenLoaded = () => {
			if (cancelled || loadFinished || !readyViewerObj) return;
			if (successfulLoadCount < expectedLoadCount) return;

			loadFinished = true;
			clearLoadTimeout();
			if (onReadyScript) window.Jmol.script(readyViewerObj, onReadyScript);
			setViewerObj(readyViewerObj);
			onReadyRef.current?.(readyViewerObj);
		};

		const jsmolIsReady = (obj: any) => {
			if (cancelled || !obj) return;
			appletRef.current = obj;
			readyViewerObj = obj;
			publishViewerWhenLoaded();
		};

		const jsmolLoadStruct = (
			_appletName: string,
			_url: string,
			filename: string,
			_modelName: string,
			errorMessage: unknown,
			status: number | string,
		) => {
			if (cancelled || loadFinished) return;

			const numericStatus = Number(status);
			const detail = typeof errorMessage === "string" ? errorMessage.trim() : "";
			if (numericStatus === -1 || detail) {
				const subject = filename ? ` ${filename}` : " the molecular data";
				reportLoadFailure(`JSmol failed to load${subject}${detail ? `: ${detail}` : "."}`);
				return;
			}

			// Status 0 is emitted when an existing model is zapped. Only status 3
			// represents a successfully processed file.
			if (numericStatus === 3) successfulLoadCount += 1;
			publishViewerWhenLoaded();
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
			// Defence in depth. Load scripts embed untrusted artifact text, so even
			// though useJobArtifact rejects anything that could break out of the data
			// block, Jmol must not be able to evaluate browser JavaScript.
			allowJavaScript: false,
			disableInitialConsole: true,
			addSelectionOptions: false,
			debug: false,
			readyFunction: jsmolIsReady,
			loadStructCallback: jsmolLoadStruct,
		};

		if (expectedLoadCount > 0) {
			loadTimeoutId = setTimeout(
				() => reportLoadFailure("JSmol timed out while loading the molecular data."),
				JSMOL_LOAD_TIMEOUT_MS,
			);
		}

		// JSmol enables an analytics tracker on any non-localhost page and fires
		// it when the first applet is created, injecting a hidden iframe that
		// reports document.location.href to the JSmol host. Result page URLs
		// contain job IDs, so clear it before the applet is built.
		(window.Jmol as { _tracker?: unknown })._tracker = null;

		window.Jmol.getApplet(viewerObjId, Info);
		viewerRef.current.innerHTML = window.Jmol.getAppletHtml(viewerObjId, Info);

		return () => {
			cancelled = true;
			clearLoadTimeout();
			if (!cleanupOnChange) return;

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
	}, [viewerObjId, src, loadScript, skip, cleanupOnChange, expectedLoadCount, onReadyScript]);

	return { viewerRef, viewerObj, setViewerObj, appletRef };
}
