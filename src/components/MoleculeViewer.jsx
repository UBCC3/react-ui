import { useEffect, useRef } from 'react';

function MoleculeViewer({ data, format }) {
	const viewerRef = useRef();

	useEffect(() => {
		if (!data || !window.$3Dmol) return;

		const element = viewerRef.current;
		element.innerHTML = "";

		const viewer = window.$3Dmol.createViewer(element, {
			backgroundColor: "white",
		});

		viewer.addModel(data, format);
		viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
		viewer.zoomTo();
		viewer.resize();      // force canvas to match container’s computed size
		viewer.zoomTo();      // center/zoom model
		viewer.render();
	}, [data, format]);

	return (
		<div
			ref={viewerRef}
			style={{
				width: "100%",
				height: "100%",      // let the parent Box drive the height
				border: "none",
				boxSizing: "border-box"
			}}
		/>
	);
}

export default MoleculeViewer;
