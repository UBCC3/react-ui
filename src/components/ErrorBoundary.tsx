import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

/**
 * Catches render-time errors so one broken page does not blank the whole app.
 *
 * Without this, any throw during render unmounts the entire React tree and the
 * user is left with a white screen and nothing but a console stack trace.
 */
class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Unhandled render error", error, info.componentStack);
	}

	handleReload = () => {
		window.location.reload();
	};

	render() {
		if (!this.state.error) return this.props.children;

		return (
			<Box sx={{ p: 4 }}>
				<Typography variant="h6" gutterBottom>
					Something went wrong.
				</Typography>
				<Typography variant="body2" sx={{ mb: 2 }}>
					{this.state.error.message}
				</Typography>
				<Button variant="contained" onClick={this.handleReload}>
					Reload
				</Button>
			</Box>
		);
	}
}

export default ErrorBoundary;
