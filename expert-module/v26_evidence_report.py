"""Produce a standalone, local-only V26 GIS evidence HTML report.

This is a printable preview, NOT a certified PDF or legal opinion.
The caller supplies the output of v26_batch_analysis.analyze.
Leaflet and OSM tiles require network; no dossier is uploaded by this module.
"""
from __future__ import annotations
import html
import json
from pathlib import Path


def render_report(batch: dict, *, title: str = "ТПУ Пловдив — ГИС анализ V26") -> str:
    if batch.get("schema") != "V26_BATCH_1":
        raise ValueError("Expected V26_BATCH_1 data")
    rows = []
    features = []
    for item in batch["results"]:
        parcel = html.escape(str(item["parcel_id"]))
        zone = html.escape(str(item["zone_code"]))
        role = html.escape(str(item["parcel_role"]))
        area = html.escape(str(item["area_m2"]))
        pct = html.escape(str(item["parcel_percent"]))
        source = html.escape(str(item["zone_source"]))
        date = html.escape(str(item.get("zone_source_date") or "ПРЕДСТОИ"))
        rows.append(f"<tr><td>{parcel}</td><td>{role}</td><td>{zone}</td><td>{area}</td><td>{pct}</td><td>{source}</td><td>{date}</td></tr>")
        features.extend(item["geometry"]["features"])
    issues = "".join(f"<li>{html.escape(str(i))}</li>" for i in batch["issues"])
    geojson = json.dumps({"type":"FeatureCollection","features":features},ensure_ascii=False).replace("<","\\u003c").replace(">","\\u003e").replace("&","\\u0026")
    safe_title = html.escape(title)
    return """<!doctype html><html lang="bg"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>""" + safe_title + """</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>body{font:14px system-ui,sans-serif;margin:24px;color:#18333a}h1{font-size:23px}
#map{height:420px;border:1px solid #aaa;margin:15px 0}table{width:100%;border-collapse:collapse;font-size:12px}
td,th{border:1px solid #aaa;padding:6px;text-align:left}th{background:#e8f1ed}
.warning{border-left:4px solid #a66b15;padding:10px;background:#fff5e8}
@media print{body{margin:10mm}#map{height:110mm}button{display:none}thead{display:table-header-group}}
</style></head><body><h1>""" + safe_title + """</h1>
<p class="warning"><strong>РАБОТЕН СПРАВОЧЕН ДОКУМЕНТ.</strong> Геометрията и актуалността на защитените зони изискват експертна проверка. Няма автоматичен правен извод. Печатът в PDF не удостоверява официална граница.</p>
<button onclick="window.print()">Печат / Запази като PDF</button>
<div id="map"></div>
<h2>Пресичания по имоти и защитени зони</h2>
<table><thead><tr><th>КАДНУМ</th><th>Роля</th><th>Зона</th><th>Пресичане, m²</th><th>% от имота</th><th>Източник</th><th>Дата</th></tr></thead><tbody>""" + "".join(rows) + """</tbody></table>
<h2>Предупреждения и проблеми</h2><ul>""" + (issues or "<li>Няма регистрирани технически проблеми; официалната актуалност остава непотвърдена.</li>") + """</ul>
<p>Площи: EPSG:6933. Процентите са за всяка двойка имот–зона; не се сумират между припокриващи се зони. Източникът на всяка зона е посочен в таблицата.</p>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>const data=""" + geojson + """;
if(window.L){const map=L.map('map').setView([42.15,24.6],10);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);
const style={protected_zone:{color:'#1767bd',weight:2,fillOpacity:.08},parcel:{color:'#148344',weight:3,fillOpacity:.12},intersection:{color:'#e17d12',weight:2,fillOpacity:.6}};
const layer=L.geoJSON(data,{style:f=>style[f.properties.layer]||{},onEachFeature:(f,l)=>{const p=f.properties||{};const t=[p.parcel_id,p.zone_code].filter(Boolean).join(' · ');l.bindTooltip(t||p.layer,{sticky:true});}}).addTo(map);
if(layer.getBounds().isValid())map.fitBounds(layer.getBounds().pad(.1));}
</script></body></html>"""


def save_report(batch: dict, path: str | Path) -> Path:
    target = Path(path)
    target.write_text(render_report(batch), encoding="utf-8")
    return target
