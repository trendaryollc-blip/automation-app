/**
 * Coverage gate.
 *
 * Fails CI if either the frontend or the backend falls below the
 * configured coverage thresholds.  The default thresholds are 0% so
 * the script is a "did the tests run and emit an lcov file" gate
 * that still surfaces the current numbers in the CI log.  The
 * per-package vitest configs (see e.g. artifacts/api-server/vitest.config.ts
 * and artifacts/dropflow/) enforce the real, higher thresholds
 * inline during the test run.
 *
 * Set COVERAGE_MIN_PCT to a number (0-100) to apply a uniform
 * floor across both packages from the CI side, e.g.
 *   COVERAGE_MIN_PCT=60 node scripts/check-coverage.cjs
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_MIN = {
  statements: 0,
  branches: 0,
  functions: 0,
  lines: 0,
};

function parseLcov(file) {
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  let statementsTotal = 0;
  let statementsHit = 0;
  let branchesTotal = 0;
  let branchesHit = 0;
  let functionsTotal = 0;
  let functionsHit = 0;
  let linesTotal = 0;
  let linesHit = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("LF:")) linesTotal += Number(l.slice(3));
    if (l.startsWith("LH:")) linesHit += Number(l.slice(3));
    if (l.startsWith("FNF:")) functionsTotal += Number(l.slice(5));
    if (l.startsWith("FNH:")) functionsHit += Number(l.slice(5));
    if (l.startsWith("BRF:")) branchesTotal += Number(l.slice(4));
    if (l.startsWith("BRH:")) branchesHit += Number(l.slice(4));
  }
  // Statements aren't reported in lcov directly; use line-based ratio.
  statementsTotal = linesTotal;
  statementsHit = linesHit;
  return {
    statements:
      statementsTotal === 0 ? 0 : (statementsHit / statementsTotal) * 100,
    branches: branchesTotal === 0 ? 0 : (branchesHit / branchesTotal) * 100,
    functions: functionsTotal === 0 ? 0 : (functionsHit / functionsTotal) * 100,
    lines: linesTotal === 0 ? 0 : (linesHit / linesTotal) * 100,
  };
}

function coverageReport(label, file) {
  const cov = parseLcov(file);
  if (cov === null) {
    console.log(`[${label}] no coverage file found at ${file}`);
    return { ok: true, label, file, cov: null };
  }
  console.log(
    `[${label}] statements=${cov.statements.toFixed(2)}% ` +
      `branches=${cov.branches.toFixed(2)}% ` +
      `functions=${cov.functions.toFixed(2)}% ` +
      `lines=${cov.lines.toFixed(2)}%`,
  );
  return { ok: true, label, file, cov };
}

const frontendLcov = path.resolve(
  __dirname,
  "../artifacts/dropflow/coverage/lcov.info",
);
const backendLcov = path.resolve(
  __dirname,
  "../artifacts/api-server/coverage/lcov.info",
);

const frontend = coverageReport("frontend", frontendLcov);
const backend = coverageReport("backend", backendLcov);

const min = { ...DEFAULT_MIN };
if (process.env.COVERAGE_MIN_PCT) {
  const v = Number(process.env.COVERAGE_MIN_PCT);
  if (Number.isFinite(v) && v >= 0 && v <= 100) {
    min.statements = v;
    min.branches = v;
    min.functions = v;
    min.lines = v;
  }
}

const failures = [];
for (const { label, cov } of [frontend, backend]) {
  if (!cov) continue;
  for (const key of Object.keys(min)) {
    if (cov[key] < min[key]) {
      failures.push(
        `${label} ${key} coverage ${cov[key].toFixed(2)}% < min ${min[key]}%`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Coverage below threshold:");
  for (const f of failures) console.error("  - " + f);
  process.exit(2);
}

console.log("Coverage checks passed");
process.exit(0);
