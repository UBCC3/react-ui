import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React, { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { createServer } from "vite";

let server;
let useJsmolViewer;

before(async () => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	server = await createServer({
		configFile: false,
		server: { middlewareMode: true, hmr: false },
		appType: "custom",
		optimizeDeps: { noDiscovery: true },
	});
	({ useJsmolViewer } = await server.ssrLoadModule("/src/hooks/UseJsmolViewer.ts"));
});

after(async () => {
	delete globalThis.window;
	delete globalThis.IS_REACT_ACT_ENVIRONMENT;
	await server.close();
});

test("publishes the viewer from readyFunction without a loadStruct callback", async () => {
	const viewer = { id: "viewer" };
	const container = { innerHTML: "" };
	const calls = { getApplet: 0, getAppletHtml: 0, ready: 0, script: [] };
	let publishedViewer = null;
	let receivedInfo = null;

	globalThis.window = {
		Jmol: {
			_tracker: "enabled",
			getApplet() {
				calls.getApplet += 1;
			},
			getAppletHtml(_id, info) {
				calls.getAppletHtml += 1;
				receivedInfo = info;
				queueMicrotask(() => info.readyFunction(viewer));
				return '<div id="mock-applet"></div>';
			},
			script(obj, script) {
				calls.script.push([obj, script]);
			},
		},
	};

	function Harness() {
		const { viewerRef, viewerObj } = useJsmolViewer({
			viewerObjId: "testApplet",
			src: "",
			loadScript: 'load DATA "model test"\n1\n\nH 0 0 0\nend "model test";',
			onReadyScript: "zoom 50;",
			onReady: () => {
				calls.ready += 1;
			},
		});

		useEffect(() => {
			publishedViewer = viewerObj;
		}, [viewerObj]);

		return React.createElement("div", { ref: viewerRef });
	}

	let renderer;
	await act(async () => {
		renderer = create(React.createElement(Harness), {
			createNodeMock: () => container,
		});
		await Promise.resolve();
	});

	assert.equal(calls.getApplet, 0, "the hook must not create a second applet");
	assert.equal(calls.getAppletHtml, 1);
	assert.equal(calls.ready, 1);
	assert.equal(receivedInfo.loadStructCallback, undefined);
	assert.equal(window.Jmol._tracker, null);
	assert.equal(container.innerHTML, '<div id="mock-applet"></div>');
	assert.equal(publishedViewer, viewer);
	assert.deepEqual(calls.script, [[viewer, "zoom 50;"]]);

	await act(async () => renderer.unmount());
});
