const fs = require("fs");

const SOURCE = "Defqon1_2026_Printable_Timetable.html";
const TARGET = "festivals/defqon-1/timetable.csv";

const html = fs.readFileSync(SOURCE, "utf8");
const rows = [];
let day = "";
let stage = null;

const tokenPattern = /<div class="day-header">[\s\S]*?<h1 class="day-title">([\s\S]*?)<\/h1>[\s\S]*?<\/div>|<div class="stage-header" style="background-color:\s*([^;"]+);">([\s\S]*?)<\/div>|<div class="stage-host">([\s\S]*?)<\/div>|<div class="event"><span class="event-time">([\s\S]*?)<\/span><span class="event-artist">([\s\S]*?)<\/span><\/div>/g;

for (const match of html.matchAll(tokenPattern)) {
  if (match[1]) {
    day = clean(match[1]);
    stage = null;
    continue;
  }

  if (match[2] && match[3]) {
    stage = {
      name: clean(match[3]),
      host: "",
      color: clean(match[2]),
    };
    continue;
  }

  if (match[4] && stage) {
    stage.host = clean(match[4]);
    continue;
  }

  if (match[5] && match[6] && day && stage) {
    rows.push({
      day,
      stage: stage.name,
      host: stage.host,
      color: stage.color,
      time: clean(match[5]),
      artist: clean(match[6]),
      end: "",
    });
  }
}

const csv = [
  ["day", "stage", "host", "color", "time", "artist", "end"].join(","),
  ...rows.map((row) => [
    row.day,
    row.stage,
    row.host,
    row.color,
    row.time,
    row.artist,
    row.end,
  ].map(csvCell).join(",")),
].join("\n") + "\n";

fs.writeFileSync(TARGET, csv, "utf8");

const days = new Set(rows.map((row) => row.day));
const stages = new Set(rows.map((row) => `${row.day}::${row.stage}`));
console.log(`${rows.length} sets, ${stages.size} day/stage blocks, ${days.size} days written to ${TARGET}`);

function clean(value) {
  return decodeHtml(stripTags(String(value)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
