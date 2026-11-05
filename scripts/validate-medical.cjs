const content = require("../assets/js/sono/content.js");
const { validate } = require("../assets/js/sono/core.js");
const publication = process.argv.includes("--publication");
const xray = require("../assets/js/roentgen/content.js");
const xrayErrors = require("../assets/js/roentgen/core.js").validate(xray);
for (const m of xray.media) {
  const file = require("node:path").join(__dirname, "../assets/media/roentgen", m.file);
  if (!require("node:fs").existsSync(file)) xrayErrors.push("Missing Röntgen image: " + m.file);
}
if (publication && xray.reviewStatus !== "medically-reviewed") xrayErrors.push("Röntgen: medical review pending");
const quiz = require("../assets/js/academy/quiz.js").load(
  require("node:fs").readFileSync(
    require("node:path").join(__dirname, "../assets/data/fragen.csv"),
    "utf8",
  ),
);
const errors = validate(content, publication).concat(
  quiz.errors.map((e) => "fragen.csv: " + e), xrayErrors,
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Medical schema OK: ${content.lessons.length} archived SONO lessons, ${quiz.questions.length} academy questions; Röntgen: ${xray.lessons.length} lessons, ${xray.lessons.flatMap(l => l.questions).length} exercises, ${xray.media.length} images. Content awaits expert review; schema checks do not certify medical accuracy.`,
  );
