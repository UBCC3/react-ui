// App.jsx  ────────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import SubmitJob from './pages/StandardAnalysis';
import ViewJob from './pages/ViewJob';
import MenuAppBar from './components/MenuAppBar';
import RequireAuth from './components/RequireAuth';
import MenuDrawer from './components/MenuDrawer';
import MoleculeLibrary from './pages/MoleculeLibrary';
import AdvancedAnalysis from './pages/AdvancedAnalysis/AdvancedAnalysis';
import MainContent from './components/MainContent';
import { DrawerProvider } from './components/DrawerContext';   // ← NEW
import { Box, CssBaseline, Toolbar } from '@mui/material';

function App() {
	return (
		<BrowserRouter>
			<DrawerProvider>          {/* ← provides width & toggle to every child */}
				<Box sx={{ display: 'flex' }}>
					<CssBaseline />

					{/* Drawer + AppBar no longer need props */}
					<MenuDrawer />
					<MenuAppBar />

					{/* Main content resizes automatically */}
					<MainContent>
						<Routes>
							<Route
								path="/"
								element={<RequireAuth><Home /></RequireAuth>}
							/>
							<Route
								path="/submit"
								element={<RequireAuth><SubmitJob /></RequireAuth>}
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
						</Routes>
					</MainContent>
				</Box>
			</DrawerProvider>
		</BrowserRouter>
	);
}

export default App;
