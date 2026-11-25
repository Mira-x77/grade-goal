/**
 * Stamp cls: tags on exam_papers so mixed séries appear in every named class.
 *   node scripts/expand-paper-class-tags.mjs --execute
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXECUTE = process.argv.includes("--execute");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(path.join(ROOT, "exam-library-admin", ".env"));
loadEnvFile(path.join(ROOT, ".env"));

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const PREFIX = "cls:";
const OFFICIAL = new Set([
  "6ème", "5ème", "4ème", "3ème",
  "2nde", "2nde A4", "2nde CD", "2nde E", "2nde F", "2nde G",
  "1ère", "1ère A4", "1ère C", "1ère D", "1ère E", "1ère F", "1ère G",
  "Tle", "Tle A4", "Tle C", "Tle D", "Tle E", "Tle F", "Tle G",
  "CEPD", "CAP", "Primaire", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "Autre",
]);

function stripAccents(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}
function normClassText(s) {
  let n = stripAccents(s || "").toLowerCase();
  n = n.replace(/g[\s-]?lome|grand lome/g, " ");
  n = n.replace(/\bg[\s-]?l\b/g, " ");
  n = n.replace(/\bgeo(?:graphie)?\b|\bgeographie\b/g, " ");
  n = n.replace(/\banglais\b|\benglish\b/g, " ");
  n = n.replace(/\bcomposition\b|\bdevoir\b|\binterro\b|\bannales\b/g, " ");
  n = n.replace(/\b\d+\s*(er|e|eme|nd)?\s*(semestre|trimestre)\b/g, " ");
  n = n.replace(/\bsemestre\b|\btrimestre\b/g, " ");
  n = n.replace(/[^a-z0-9]+/g, " ");
  return n.replace(/\s+/g, " ").trim();
}
function seriesFromFollow(follow, cycle) {
  const f = ` ${follow} `;
  const out = [];
  if (cycle === "2nde") {
    if (/\ba4\b/.test(f) || /\ba\b/.test(f)) out.push("2nde A4");
    if (/\bcd\b/.test(f) || (/\bc\b/.test(f) && /\bd\b/.test(f))) out.push("2nde CD");
    if (/\be\b/.test(f)) out.push("2nde E");
    if (/\bf\b/.test(f)) out.push("2nde F");
    if (/\bg\b/.test(f)) out.push("2nde G");
    return [...new Set(out)];
  }
  if (/\bcd\b/.test(f)) {
    out.push(`${cycle} C`, `${cycle} D`);
  }
  if (/\ba4\b/.test(f) || /\ba\b/.test(f)) out.push(`${cycle} A4`);
  if (/\bc\d*\b/.test(f)) out.push(`${cycle} C`);
  if (/\bd\b/.test(f)) out.push(`${cycle} D`);
  if (/\be\b/.test(f)) out.push(`${cycle} E`);
  if (/\bf\b/.test(f)) out.push(`${cycle} F`);
  if (/\bg\b/.test(f)) out.push(`${cycle} G`);
  return [...new Set(out)];
}
function parseMentionedClassLevels(text) {
  const n = normClassText(text);
  if (!n) return [];
  const out = new Set();
  const compact = [
    [/\b1erec\d*\b/, "1ère C"],
    [/\b1ered\d*\b/, "1ère D"],
    [/\b1ereg\d*\b/, "1ère G"],
    [/\b1erea4\b|\b1erea\b/, "1ère A4"],
    [/\btlec\d*\b/, "Tle C"],
    [/\btled\d*\b/, "Tle D"],
    [/\btlea4\b|\btlea\b/, "Tle A4"],
    [/\btleg\b/, "Tle G"],
  ];
  for (const [re, level] of compact) if (re.test(n)) out.add(level);
  const windows = [
    [/\b(?:1ere|premieres|premiere|1re)\b\s*([a-z0-9 ]{0,56})/g, "1ère"],
    [/\b(?:tle|terminale|terminal)\b\s*([a-z0-9 ]{0,56})/g, "Tle"],
    [/\b(?:2nde|seconde)\b\s*([a-z0-9 ]{0,56})/g, "2nde"],
  ];
  for (const [re, cycle] of windows) {
    re.lastIndex = 0;
    let m;
    let any = false;
    while ((m = re.exec(n))) {
      any = true;
      for (const level of seriesFromFollow(m[1] || "", cycle)) out.add(level);
    }
    if (any && cycle !== "2nde" && /scientif/.test(n)) {
      out.add(`${cycle} C`);
      out.add(`${cycle} D`);
    }
  }
  return [...out].filter((l) => OFFICIAL.has(l));
}
function splitStored(stored) {
  if (!stored) return [];
  return stored.split(/\s*(?:,|\/|;|\||&|\bet\b)\s*/i).map((p) => p.trim()).filter((p) => OFFICIAL.has(p));
}

async function main() {
  const { data, error } = await supabase.from("exam_papers").select("id, title, file_name, class_level, tags, description");
  if (error) throw error;
  let changed = 0;
  for (const row of data ?? []) {
    const mentioned = parseMentionedClassLevels(`${row.title} ${row.file_name} ${row.description || ""} ${row.class_level}`);
    const levels = [...new Set([...splitStored(row.class_level), ...mentioned])];
    const otherTags = (row.tags || []).filter((t) => !String(t).startsWith(PREFIX));
    const next = [...otherTags, ...levels.filter((l) => l !== "Autre").map((l) => PREFIX + l)];
    const prev = JSON.stringify([...(row.tags || [])].sort());
    const now = JSON.stringify([...next].sort());
    if (prev === now) continue;
    changed++;
    console.log(row.class_level, "→", levels.join(" · "), "|", (row.title || "").slice(0, 70));
    if (EXECUTE) {
      const { error: upErr } = await supabase.from("exam_papers").update({ tags: next }).eq("id", row.id);
      if (upErr) console.error("  fail", upErr.message);
    }
  }
  console.log(EXECUTE ? `Updated ${changed}` : `Would update ${changed} (run --execute)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
