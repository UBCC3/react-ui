# Vendored JSmol runtime

`jsmol-16.3.33-runtime.tar.gz` is the browser runtime used by MolMaker's
molecular viewers. It is stored as one compressed archive instead of 1,771
expanded generated files.

`npm run dev` and `npm run build` automatically verify the archive checksum
and extract it to `public/vendor/jsmol/16.3.33`. The extracted directory is
ignored by Git. Production builds fail if the runtime is absent or incomplete.

The archive was made from the Jmol 16.3.33 binary distribution previously used
in production. Jmol project information and source releases are available at
<https://jmol.sourceforge.net/>. Its GNU Lesser General Public License 2.1 is
included as `JMOL-LICENSE.txt`.

When updating JSmol, update the archive, checksum, version constants in the
preparation and verification scripts, and the versioned asset paths in
`src/hooks/UseJsmolViewer.ts`. Test molecular previews and every result viewer
before deployment.
