# MolMaker Frontend Codebase Documentation

This document provides an overview of the main files, components, and their responsibilities in the MolMaker frontend codebase. Use this as a guide to understand where features and logic are implemented.

---

## Top-Level Structure

- **App.tsx**
  - Main entry point for the React app.
  - Sets up routing using `react-router-dom`.
  - Wraps the app in `DrawerProvider` (for global drawer state - open or closed?), and includes the main layout (`MenuDrawer`, `MenuAppBar`, `MainContent`).
  - All routes are protected by `RequireAuth` (uses Auth0 for authentication). Unless a user is logged in, they will not be able to access any pages except the login page.

---

## Layout & Navigation

- **components/MenuAppBar.tsx**
  - Top navigation bar, includes user info, actions, and notifications for group management.
- **components/MenuDrawer.tsx**
  - Side drawer for navigation between pages.
- **components/MainContent.tsx**
  - Main content area, wraps routed pages.
- **components/DrawerContext.tsx**
  - Context provider for managing drawer open/close state.

---

## Routing & Pages

- **pages/Home/Home.tsx**
  - Dashboard/homepage for authenticated users.
- **pages/SubmitJob/StandardAnalysis.tsx**
  - Standard workflow job submission form and workflow - Molecular Energy -> Optimization -> Vibration.
- **pages/SubmitJob/AdvancedAnalysis.tsx**
  - Advanced job submission form and workflow.
- **pages/ViewJob.tsx**
  - View details and results for a specific job.
- **pages/ResultPage.tsx**
  - Displays job results, including molecular visualizations and analysis.
- **pages/JobFail.tsx**
  - Error/failure page for jobs that did not complete successfully.
- **pages/MoleculeLibrary.tsx**
  - User's molecule library, with sorting, filtering, and chemical formula rendering.
- **pages/Admin.tsx**
  - Admin dashboard and controls.
- **pages/Group.tsx**
  - Group management and group-related features.
- **pages/Users.tsx**
  - User management and user list - admin only.
- **pages/NotFound.tsx**
  - 404 page for unmatched routes.

---

## JSmol & Molecular Visualization

- **components/JSmol/**
  - Contains all components related to molecular and orbital visualization using JSmol.
  - **OrbitalViewer.tsx**: Main molecular orbital viewer, with tabs for structure and graph, advanced controls, and dialogs.
  - **OrbitalProperty.tsx**: Controls for orbital property visualization (isosurface, slice plane, color scaling).
  - Other components for energy, optimization, vibration, partial charge, etc.

---

## UI Components (Reusable)

- **components/custom/**
  - Custom UI components (alerts, dropdowns, loading spinners, molecule selectors, etc.) used throughout the app.
  - Any component that is reused in multiple places should ideally go here.

---

## Data & API

- **services/api.ts**
  - API calls for jobs, molecules, user data, etc.

---

## Types & Constants

- **types/**
  - TypeScript type definitions for core entities (Job, User, Group, Molecule, JSmol, etc.).
- **constants.ts**
  - App-wide constants.

---

## Assets & Public Files

- **src/assets/**
  - Images, SVGs, and other static assets.
- **public/**
  - Example molecule files, JSmol scripts, and other public resources.

---

## Miscellaneous

- **declarations.d.ts**
  - TypeScript module declarations for importing SVGs and other non-code assets.
- **vite.config.js**
  - Vite configuration for building and serving the app.
- **eslint.config.js**
  - ESLint configuration for code linting.

---

## How to Find Features

- **Routing:** See `App.tsx` for all available routes and which component/page handles each path.
- **Molecule/Orbital Visualization:** See `components/JSmol/OrbitalViewer.tsx` and related files.
- **Job Submission:** See `pages/SubmitJob/StandardAnalysis.tsx` and `AdvancedAnalysis.tsx`.
- **User/Group/Admin:** See `pages/Users.tsx`, `Group.tsx`, and `Admin.tsx`.
- **My Molecule Library:** See `pages/MoleculeLibrary.tsx`.

---

## How to Run the App in Development
1. Ensure you have Node.js and npm installed.
2. Clone the repository.
3. Navigate to the project directory.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open your browser and navigate to `http://localhost:5173` (default Vite port).
7. If you are running in development mode, the app will be served without a base path. In production, it will be served under `/ubchemica`.
8. Ensure you have the necessary environment variables set up for Auth0 authentication.
9. If you encounter any issues, check the console for errors and ensure your environment is correctly configured.
---

## How to Deploy the App to Production
1. Reach out to Mark to get the credentials for the EC2 instance where the app is hosted.
2. ssh into the EC2 instance. This will prompt you for the password.
```bash
ssh -i [username]@ec2-3-99-64-179.ca-central-1.compute.amazonaws.com
```
3. This is the user that has access to the frontend codebase. This will prompt you for the password. Reach out to Mark for the password.
```bash
su frontend
```
4. Navigate to the project directory.
```bash
cd /home/frontend/react-ui
```
5. Pull the latest changes from the repository.
```bash
git pull origin main
```
6. Install dependencies:
```bash
npm ci
```
   - This will install the dependencies without modifying the `package-lock.json` file.
   - If you need to update dependencies, use `npm install` instead.
7. Build the app for production:
```bash
npm run build
```
8. The built files will be in the `dist` directory. Navigate to the `dist` directory:
```bash
cd dist
```
9. Copy the js file from `./assets` to the `/var/www/html/ubchemica/assets` directory:
```bash
cp ./assets/index_[some hash].js /var/www/html/ubchemica/assets/
```
10. If any stylesheets are changed, copy them as well:
```bash
cp ./assets/index_[some hash].css /var/www/html/ubchemica/assets/
```
11. Now open the `/var/www/html/ubchemica/index.html` file in a text editor:
```bash
nano /var/www/html/ubchemica/index.html
```
12. Update the `<script type="module" crossorigin src="assets/index-[hash].js"></script>` tag to point to the new js file you copied in step 10.
13. Also update the `<link rel="stylesheet" crossorigin href="assets/index-[hash].css">` tag to point to the new css file you copied in step 11.
14. Save the changes and exit the text editor.
15. Restart the web server to apply the changes:
```bash
sudo systemctl restart nginx
```
16. Open your browser and navigate to `https://www.ubchemica.com` to see the updated app.
---

## Onboarding New Developers

If you're new to React here are some things you can do to get started in the first week:
- We mostly use the 2 most basic hooks: `useState` and `useEffect`. You can learn more about them in the [React documentation](https://reactjs.org/docs/hooks-intro.html). This should be sufficient to understand how state is managed in the app. If you come across code that you don't understand, i'd recommend you look up the specific hook or function in the React documentation.
- I would also recommend you go through the [React tutorial](https://reactjs.org/tutorial/tutorial.html) to get a better understanding of how React works.
- For state management, we use the Context API. You can learn more about it in the [React documentation](https://reactjs.org/docs/context.html).
- For routing, we use `react-router-dom`. You can learn more about it in the [React Router documentation](https://reactrouter.com/en/main).
- For styling, we use MUI (Material-UI). You can learn more about it in the [MUI documentation](https://mui.com/material-ui/all-components/).
- We also use Tailwind CSS for utility-first styling. You can learn more about it in the [Tailwind CSS documentation](https://tailwindcss.com/docs).
- For TypeScript, we use it to add type safety to our React components. You can learn more about it in the [TypeScript documentation](https://www.typescriptlang.org/docs/). Please avoid using `any` type as much as possible, and use specific types instead.
- Avoid using custom css files as much as possible. We use MUI and Tailwind CSS for styling, so try to use them instead of writing custom css. If you need to write custom styles, use the `sx` prop provided by MUI or the `className` prop with Tailwind CSS classes. This will help keep the codebase consistent and maintainable.
- We use `axios` for making API calls, so you can refer to the [Axios documentation](https://axios-http.com/docs/intro) for more information on how to use it. Avoid using `fetch` for API calls, as we have a consistent way of handling API requests and responses using `axios`.

Now that you have a basic understanding of the codebase, you can start exploring the components and pages in the `src` directory. Here are some tips:
- Start with the `App.tsx` file to understand the overall structure and routing of the app.
- Explore the `components` directory to see the reusable components used throughout the app.
- Look at the `pages` directory to see the different pages and their components.
- Check the `services` directory for API calls and data fetching logic.
