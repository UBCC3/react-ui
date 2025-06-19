// App.jsx  ────────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import StandardAnalysis from './pages/SubmitJob/StandardAnalysis';
import ViewJob from './pages/ViewJob';
import NotFound from './pages/NotFound';
import MenuAppBar from './components/MenuAppBar';
import RequireAuth from './components/RequireAuth';
import MenuDrawer from './components/MenuDrawer';
import MoleculeLibrary from './pages/MoleculeLibrary';
import AdvancedAnalysis from './pages/SubmitJob/AdvancedAnalysis';
import MainContent from './components/MainContent';
import { DrawerProvider } from './components/DrawerContext';
import { Box, CssBaseline } from '@mui/material';
import ResultPage from "./components/JSmol/resultPage";

function App() {
	return (
		<BrowserRouter>
			<DrawerProvider>
				<Box sx={{ display: 'flex' }}>
					<CssBaseline />
					<MenuDrawer />
					<MenuAppBar />
					<MainContent>
						<Routes>
							<Route
								path="/"
								// element={<RequireAuth><Home /></RequireAuth>}
								element={<RequireAuth><ResultPage /></RequireAuth>}
							/>
							<Route
								path="/submit"
								element={<RequireAuth><StandardAnalysis /></RequireAuth>}
							/>
							<Route
								path="/library"
								element={<RequireAuth><MoleculeLibrary /></RequireAuth>}
							/>
							<Route
								path="/jobs/:jobId"
								element={<RequireAuth><ViewJob /></RequireAuth>}
							/>
							<Route
								path="/advanced"
								element={<RequireAuth><AdvancedAnalysis /></RequireAuth>}
							/>
							<Route
								path="*"
								element={<RequireAuth><NotFound /></RequireAuth>}
							/>
						</Routes>
					</MainContent>
				</Box>
			</DrawerProvider>
		</BrowserRouter>
	);
}

export default App;
