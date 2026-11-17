import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const base="1e949e654f9d002f51f7e0b0e8629a78f43512d1";
const home="vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html";
const page="vt03/kt80/kt125/ACCESS_ADMIN_KT125.html";
const before=execFileSync("git",["show",base+":"+home],{encoding:"utf8"});
const after=fs.readFileSync(home,"utf8");
const panel=fs.readFileSync(page,"utf8");

const css=after.match(/<style id="kt125-access-launcher-style">[\s\S]*?<\/style>/g)||[];
assert.equal(css.length,1,"Exactly one isolated access launcher stylesheet");
const link=after.match(/<a id="kt125AccessLauncher"[^>]*>[^<]*<\/a>/g)||[];
assert.equal(link.length,1,"Exactly one access launcher on dashboard");
assert(link[0].includes('href="kt125/ACCESS_ADMIN_KT125.html"'));
assert(link[0].includes('target="_blank"'));
assert(css[0].includes('body[data-kt80-view="home"] #kt125AccessLauncher'));
assert(css[0].includes('body:has(#overlay.open) #kt125AccessLauncher'));

const cleaned=after.replace(css[0],"").replace(link[0],"");
assert.equal(cleaned,before,
 "Original R6 dashboard must be byte-identical after removing only the added style and button");
const position=after.indexOf(link[0]),bridge=after.indexOf("✦ Портал към историята · V27.35 ↗</a>");
assert(position>bridge&&position<bridge+300,"New access button must sit directly beside original V27.35 bridge");
assert(panel.includes('id="panel-users"')&&panel.includes('id="panel-roles"')&&
 panel.includes('id="panel-cases"')&&panel.includes('id="panel-audit"'));
assert(panel.includes("служебният достъп още не е активиран"));
assert(!/<form\b/i.test(panel),"Static preview must not take fake credentials");
assert(!/fetch\s*\(/.test(panel),"Preview must not connect to unconfigured private backend");
assert(!/localStorage|sessionStorage/.test(panel),"Preview must not store case/session details");
console.log("PASS KT125 UI: button exactly beside preserved V27.35 bridge, R6 HTML byte-equal apart from launcher, private admin preview has no fake access.");
