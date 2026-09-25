import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../dist/widget/index.html", import.meta.url);
const target = new URL("../dist/path-diagram.html", import.meta.url);
const html = readFileSync(source, "utf8").replace(/https?:\/\/(?!www\.w3\.org\/(?:2000\/svg|1999\/xlink))[^"'`\\\s)]+/g, "");
writeFileSync(target, html);
console.log(`widget bytes ${Buffer.byteLength(html)}`);
