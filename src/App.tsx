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
import Admin from './pages/Admin';
import Group from './pages/Group';
import MainContent from './components/MainContent';
import { DrawerProvider } from './components/DrawerContext';
import { Box, CssBaseline, Typography } from '@mui/material';
import ResultPage from "./components/JSmol/resultPage";
import VibrationResult from "./components/JSmol/vibrationResult";
import { useAuth0 } from '@auth0/auth0-react';
import Users from './pages/Users';

function App() {
	const { user } = useAuth0();

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
								element={<RequireAuth><Home /></RequireAuth>}
							/>
							<Route
								path="/result"
								element={<RequireAuth><ResultPage /></RequireAuth>}
							/>
							<Route
								path="/vibration"
								element={<RequireAuth><VibrationResult /></RequireAuth>}
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
								path="/admin"
								element={<RequireAuth><Admin /></RequireAuth>}
							/>
							<Route
								path="/users"
								element={<RequireAuth><Users /></RequireAuth>}
							/>
							<Route
								path="/group"
								element={<RequireAuth><Group /></RequireAuth>}
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
