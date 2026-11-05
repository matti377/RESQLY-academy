/* Optional static packaging; deployment can still serve the repository directly. */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
execFileSync(process.execPath, [path.join(__dirname, "validate-medical.cjs")], {
  stdio: "inherit",
});
for (const file of walk(path.join(root, "assets/js")).filter((f) =>
  f.endsWith(".js"),
))
  execFileSync(process.execPath, ["--check", file]);
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const output = path.join(root, "dist");
fs.mkdirSync(output, { recursive: true });
for (const file of ["index.html", "ekg", "roentgen", "sono", "assets", "EKG-Skript.pdf"])
  fs.cpSync(path.join(root, file), path.join(output, file), {
    recursive: true,
  });
console.log(
  "Static build ready: dist/ (no runtime dependencies). Expert review is still required before medical publication.",
);
