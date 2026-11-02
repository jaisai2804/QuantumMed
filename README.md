# QuantumMed

Static site (HTML, CSS, vanilla JS) for the project *Exploring Quantum Computing for Drug Discovery*. No build step, no backend.

## Test locally
```bash
python -m http.server 8000   # then open http://localhost:8000
```
Use a local server (not `file://`) so `data/water_hamiltonian.json` can load.

## Deploy to GitHub Pages
Copy everything in this folder (keeping the `data/` folder) into the repo root, commit, and push. Pages is served from `main` / `(root)`.

```
index.html  style.css  script.js  data.js  README.md
data/water_hamiltonian.json
```

## Pages
`#home`, `#water`, `#input`, `#run` (Output 1), `#graph` (Output 2), `#results` (Output 3), `#method`.

## Where the data lives
- **Input**: `data/water_hamiltonian.json` (list of `{pauli, real, imag}` terms) is summarised automatically. Any other file can be dropped in the box to inspect it locally.
- **Run, Graph, Results**: all read `window.VQE_RUN` in `data.js`. Checkpoints are `[evaluations, current Ha, best Ha, seconds]`, transcribed from the team's terminal output. Re-check them against the original log, and replace them when you re-run.
- **Water geometry**: the `GEOM` constant at the top of `script.js`.
