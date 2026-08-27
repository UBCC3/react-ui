import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let util;

before(async () => {
	server = await createServer({
		configFile: false,
		server: { middlewareMode: true, hmr: false },
		appType: "custom",
		optimizeDeps: { noDiscovery: true },
	});
	util = await server.ssrLoadModule("/src/components/JSmol/util.ts");
});

after(async () => {
	await server.close();
});

test("creates a model data block", () => {
	assert.equal(
		util.jmolInlineLoadScript("molden", "[Molden Format]"),
		'load DATA "model molden"\n[Molden Format]\nend "model molden";',
	);
});

test("creates the documented append data block", () => {
	assert.equal(
		util.jmolInlineLoadScript("esp", "cube data", { append: true }),
		'set appendNew true;\nload DATA "append esp"\ncube data\nend "append esp";',
	);
});

test("adds the Molden reader filter after the data terminator", () => {
	assert.equal(
		util.jmolInlineLoadScript("molden", "[Molden Format]", { filter: "*" }),
		'load DATA "model molden"\n[Molden Format]\nend "model molden" FILTER "*";',
	);
});

test("rejects a data terminator embedded in artifact text", () => {
	assert.equal(util.containsJmolDataTerminator('coordinates\nend "model molden";\nmo 1'), true);
});

test("accepts ordinary artifact text", () => {
	assert.equal(util.containsJmolDataTerminator("[Molden Format]\n[Atoms] (AU)"), false);
});
