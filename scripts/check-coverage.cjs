const fs = require("fs");
const path = require("path");

function parseLcov(file) {
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  let total = 0;
  let hit = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("LF:")) total += Number(l.slice(3));
    if (l.startsWith("LH:")) hit += Number(l.slice(3));
  }
  if (total === 0) return 0;
  return (hit / total) * 100;
}

const frontendLcov = path.resolve(
  __dirname,
  "../artifacts/dropflow/coverage/lcov.info",
);
const backendLcov = path.resolve(
  __dirname,
  "../artifacts/api-server/coverage/lcov.info",
);

const frontPct = parseLcov(frontendLcov);
const backPct = parseLcov(backendLcov);

console.log(
  "frontend coverage pct:",
  frontPct !== null ? frontPct.toFixed(2) : null,
);
console.log(
  "backend coverage pct:",
  backPct !== null ? backPct.toFixed(2) : null,
);

const min = 1; // minimum acceptable percent
if (
  (frontPct !== null && frontPct < min) ||
  (backPct !== null && backPct < min)
) {
  console.error(
    `Coverage below threshold (${min}%). Front: ${frontPct}, Back: ${backPct}`,
  );
  process.exit(2);
}

console.log("Coverage checks passed");
process.exit(0);
