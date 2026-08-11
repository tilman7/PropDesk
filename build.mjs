import * as esbuild from "esbuild";
import fs from "fs";

const r = await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true, minify: true, write: false,
  format: "iife", target: ["es2020"],
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".js": "jsx", ".jsx": "jsx" },
});
const js = r.outputFiles[0].text;

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>PropDesk</title>
<meta name="theme-color" content="#0D0D0D">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="PropDesk">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%23F2F2F0'/%3E%3Ccircle cx='20' cy='20' r='13' fill='none' stroke='%23141414' stroke-opacity='0.28' stroke-width='4'/%3E%3Cpath d='M20 7A13 13 0 0 1 29.19 29.19' fill='none' stroke='%23141414' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="icon.png">
<style>
html,body{margin:0;background:#0D0D0D}
#boot{font-family:Helvetica,Arial,sans-serif;color:#6E6E6A;padding:40px;font-size:13px;line-height:1.6}
#boot .err{color:#F0705A;white-space:pre-wrap;word-break:break-word}
</style>
</head>
<body>
<div id="root"><div id="boot">PropDesk lädt …</div></div>
<script>
try { if ((JSON.parse(localStorage.getItem("riskdesk:settings")||"{}")||{}).theme === "light") document.body.style.background = "#F2F2F0"; } catch (e) {}
window.addEventListener("error", function (e) {
  var b = document.getElementById("boot");
  if (b) b.innerHTML = "PropDesk — Startfehler:<br><span class='err'>" + (e.message || e.error || "unbekannt") + "</span>";
});
console.log("PropDesk build v9");
</script>
<script>${js}</script>
</body>
</html>`;

// GitHub Pages serves this repo from the root, so the bundle lands there.
fs.writeFileSync("index.html", html);
console.log("built index.html \u2014", (html.length / 1024).toFixed(0) + " KB");
