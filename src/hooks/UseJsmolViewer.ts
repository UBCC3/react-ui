import { useEffect, useRef, useState } from "react";

/**
 * JSmol posts to this host for the few operations it cannot do in the browser.
 * It is a third-party service we do not control, so it is overridable through
 * the environment; the long-term fix is to proxy it from our own backend.
 */
const JSMOL_SERVER_URL =
	import.meta.env.VITE_JSMOL_SERVER_URL || "https://chemapps.stolaf.edu/jmol/jsmol/php/jsmol.php";

const JSMOL_VERSION = "16.3.33";
const JSMOL_ASSET_BASE = `${import.meta.env.BASE_URL}vendor/jsmol/${JSMOL_VERSION}`;
const JSMOL_RUNTIME_URL = `${JSMOL_ASSET_BASE}/JSmol.min.js`;

export const JSMOL_LOAD_ERROR =
	"Molecular viewer failed to load. Please refresh the page and try again.";

let jsmolRuntimePromise: Promise<any> | null = null;

/** Load the pinned runtime once and reject if the asset did not define Jmol. */
const loadJsmolRuntime = (): Promise<any> => {
	if (typeof window.Jmol !== "undefined") return Promise.resolve(window.Jmol);
	if (jsmolRuntimePromise) return jsmolRuntimePromise;

	const script = document.createElement("script");
	script.src = JSMOL_RUNTIME_URL;
	script.async = true;
	script.dataset.molmakerJsmolRuntime = JSMOL_VERSION;

	jsmolRuntimePromise = new Promise((resolve, reject) => {
		script.addEventListener(
			"load",
			() => {
				if (typeof window.Jmol !== "undefined") {
					resolve(window.Jmol);
					return;
				}
				reject(new Error("JSmol asset loaded without defining window.Jmol"));
			},
			{ once: true },
		);
		script.addEventListener("error", () => reject(new Error("JSmol asset request failed")), {
			once: true,
		});
		document.head.appendChild(script);
	}).catch((error) => {
		// A later retry (for example, after connectivity returns) must create a
		// fresh script instead of reusing a permanently rejected promise.
		script.remove();
		jsmolRuntimePromise = null;
		throw error;
	});

	return jsmolRuntimePromise;
};

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
	 * Extra script run once the applet and its startup script are ready.
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
	/** Receives a user-facing error instead of allowing a missing runtime to crash React. */
	onError?: (message: string) => void;
}

/**
 * Initializes a JSmol applet inside a container div and exposes the
 * resulting viewer object once ready. For an inline `Info.script`, the
 * installed JSmol runtime invokes `readyFunction` after the script has loaded
 * its models. It does not emit `loadStructCallback` for `load DATA`, so callers
 * validate the loaded model metadata after the viewer is published.
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
	onError,
}: UseJsmolViewerOptions) {
	const viewerRef = useRef<HTMLDivElement>(null);
	const appletRef = useRef<any>(null);
	const [viewerObj, setViewerObj] = useState<any>(null);
	const [viewerError, setViewerError] = useState<string | null>(null);
	const onReadyRef = useRef(onReady);
	const onErrorRef = useRef(onError);

	onReadyRef.current = onReady;
	onErrorRef.current = onError;

	useEffect(() => {
		if (skip) return;
		if (!viewerRef.current) return;

		let cancelled = false;

		const reportFailure = (error: unknown) => {
			console.error("Failed to initialize the molecular viewer", error);
			if (cancelled) return;
			setViewerObj(null);
			setViewerError(JSMOL_LOAD_ERROR);
			onErrorRef.current?.(JSMOL_LOAD_ERROR);
		};

		void loadJsmolRuntime().then((jmol) => {
			if (cancelled || !viewerRef.current) return;

			try {
				setViewerError(null);

				const jsmolIsReady = (obj: any) => {
					if (cancelled || !obj) return;
					appletRef.current = obj;
					if (onReadyScript) jmol.script(obj, onReadyScript);
					setViewerObj(obj);
					onReadyRef.current?.(obj);
				};

				const Info = {
					color: "#FFFFFF",
					width: "100%",
					height: "100%",
					use: "HTML5",
					j2sPath: `${JSMOL_ASSET_BASE}/j2s`,
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
				};

				// JSmol enables an analytics tracker on any non-localhost page and fires
				// it when the first applet is created, injecting a hidden iframe that
				// reports document.location.href to the JSmol host. Result page URLs
				// contain job IDs, so clear it before the applet is built.
				(jmol as { _tracker?: unknown })._tracker = null;

				// getAppletHtml creates the applet internally when passed an id and Info.
				// Calling getApplet first creates a second applet and can fire readiness
				// callbacks twice.
				viewerRef.current.innerHTML = jmol.getAppletHtml(viewerObjId, Info);
			} catch (error) {
				reportFailure(error);
			}
		}, reportFailure);

		return () => {
			cancelled = true;
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
	}, [viewerObjId, src, loadScript, skip, cleanupOnChange, onReadyScript]);

	return { viewerRef, viewerObj, viewerError, setViewerObj, appletRef };
}
