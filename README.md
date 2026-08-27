# MolMaker UI
React UI for MolMaker

## Set-up steps

1. **Clone the repository**
   
   ```bash
   git clone https://github.com/UBCC3/react-ui.git
   ```
   
3. **Navigate to the project directory**
   
   ```bash
   cd react-ui
   ```
    
4. **Install dependencies**
   
   ```bash
   npm ci
   ```
   
   > **NOTE:** Node.js and npm are pre-requistes. Install latest versions of both if not not installed already.
   > At the time of development, I used Node.js v18.20.8 and npm v10.8.2 (latest at the time).
   
5. **Environment variables**

   Take a look at create a `.env` file and copy over the contents of `.env.example`. Fill in the missing details from Auth0.
   
7. **Run the application**
   
   ```bash
   npm run dev
   ```

## JSmol result-viewer checks

Run the fast TypeScript regression tests with:

```bash
npm test
```

Run the headless Molden/ESP integration check with:

```bash
npm run test:jsmol
```

The first integration-test run downloads and verifies the pinned Jmol runtime
and requires Java, `curl`, and `unzip`. To check actual job artifacts instead of
the committed fixtures, pass their paths after `--`:

```bash
npm run test:jsmol -- /path/to/orbitals.molden /path/to/ESP.cube
```
   
