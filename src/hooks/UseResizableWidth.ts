import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks a draggable width for a right-anchored panel and handles the
 * mousedown/mousemove/mouseup wiring needed to resize it by dragging its
 * left edge.
 *
 * While dragging, text selection is suppressed and the cursor is forced to
 * `col-resize` for the whole document so the drag feels stable even if the
 * pointer briefly leaves the handle.
 */
export function useResizableWidth(initialWidth: number, minWidth: number, maxWidth: number) {
	const [width, setWidth] = useState(initialWidth);
	const isResizing = useRef(false);

	const startResizing = useCallback(() => {
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	}, []);

	const stopResizing = useCallback(() => {
		if (!isResizing.current) return;
		isResizing.current = false;
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	}, []);

	const resize = useCallback(
		(event: MouseEvent) => {
			if (!isResizing.current) return;
			// Drawer is anchored to the right edge, so its width is the
			// distance from the pointer to the right edge of the viewport.
			const newWidth = window.innerWidth - event.clientX;
			setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
		},
		[minWidth, maxWidth],
	);

	useEffect(() => {
		window.addEventListener("mousemove", resize);
		window.addEventListener("mouseup", stopResizing);
		return () => {
			window.removeEventListener("mousemove", resize);
			window.removeEventListener("mouseup", stopResizing);
		};
	}, [resize, stopResizing]);

	return { width, startResizing };
}
