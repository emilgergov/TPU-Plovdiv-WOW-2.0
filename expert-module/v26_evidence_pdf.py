"""Independent V26 vector PDF for GIS evidence; requires reviewed V26 batch.

No remote map tiles. Geometry is drawn directly as vector paths.
This PDF is a technical draft, NOT proof of official boundary currency.
"""
from __future__ import annotations
from io import BytesIO
from pathlib import Path

def build_pdf(batch: dict) -> bytes:
    if batch.get("schema") != "V26_BATCH_1":
        raise ValueError("Expected V26_BATCH_1")
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Flowable, KeepTogether
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.enums import TA_CENTER
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from shapely.geometry import shape
    from shapely.ops import transform
    from pyproj import Transformer
    import os

    font = "Helvetica"
    for candidate in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                      "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"):
        if os.path.isfile(candidate):
            pdfmetrics.registerFont(TTFont("V26Unicode", candidate))
            font = "V26Unicode"
            break
    if font == "Helvetica":
        raise RuntimeError("Unicode font required for Bulgarian PDF output")
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = font
    styles["Title"].fontSize = 16
    styles["Normal"].fontSize = 9

    records = batch["results"]
    class VectorMap(Flowable):
        def __init__(self, entries):
            Flowable.__init__(self)
            self.width, self.height = 500, 285
            self.entries = entries
        def draw(self):
            from reportlab.lib.colors import HexColor
            cv = self.canv
            shapes = []
            to_metric = Transformer.from_crs("EPSG:4326", "EPSG:32635", always_xy=True).transform
            # EPSG:32635 used for map visualization only; EPSG:6933 is used for area.
            seen = set()
            for item in self.entries:
                for f in item["geometry"]["features"]:
                    layer = f["properties"]["layer"]
                    key = (layer, str(f["geometry"]))
                    if key in seen:
                        continue
                    seen.add(key)
                    geom = shape(f["geometry"])
                    if geom.is_empty:
                        continue
                    geom = transform(to_metric, geom)
                    shapes.append((layer, geom))
            cv.setStrokeColor(colors.lightgrey)
            cv.rect(0,0,self.width,self.height,fill=0,stroke=1)
            if not shapes:
                cv.setFont(font, 10)
                cv.drawCentredString(self.width/2,self.height/2,"НЯМА ГЕОМЕТРИЯ ЗА КАРТА")
                return
            bounds = [g.bounds for _,g in shapes]
            minx=min(b[0] for b in bounds); miny=min(b[1] for b in bounds)
            maxx=max(b[2] for b in bounds); maxy=max(b[3] for b in bounds)
            dx=max(maxx-minx,1);dy=max(maxy-miny,1)
            scale=min((self.width-30)/dx,(self.height-30)/dy)
            ox=(self.width-dx*scale)/2;oy=(self.height-dy*scale)/2
            def polygon(poly, layer):
                path=cv.beginPath()
                for ring in [poly.exterior,*poly.interiors]:
                    pts=list(ring.coords)
                    for j,(x,y) in enumerate(pts):
                        px=ox+(x-minx)*scale;py=oy+(y-miny)*scale
                        if j==0:path.moveTo(px,py)
                        else:path.lineTo(px,py)
                    path.close()
                stroke,fill={"protected_zone":("#1767bd","#d8eafa"),
                             "parcel":("#148344","#d7eddf"),
                             "intersection":("#c45b0d","#f4b45e")}.get(layer,("#444","#eee"))
                cv.setStrokeColor(HexColor(stroke))
                cv.setFillColor(HexColor(fill))
                cv.setLineWidth(1.4 if layer=="parcel" else 1)
                cv.drawPath(path,fill=1,stroke=1,fillMode=0)
            for layer in ("protected_zone","parcel","intersection"):
                for kind,geom in shapes:
                    if kind!=layer:continue
                    polygons=[geom] if geom.geom_type=="Polygon" else list(getattr(geom,"geoms",[]))
                    for poly in polygons:
                        if poly.geom_type=="Polygon":polygon(poly,layer)

    output=BytesIO()
    doc=SimpleDocTemplate(output,pagesize=(595.28,841.89),
                          leftMargin=44,rightMargin=44,topMargin=40,bottomMargin=40)
    def p(text):return Paragraph(text,styles["Normal"])
    story=[Paragraph("ТПУ Пловдив — ГИС анализ V26",styles["Title"]),Spacer(1,10),
           p("РАБОТЕН ТЕХНИЧЕСКИ ДОКУМЕНТ. Границите и източниците подлежат на експертна проверка."),
           p("Не представлява правно становище или удостоверяване на актуална официална граница."),
           Spacer(1,10),VectorMap(records),Spacer(1,8),
           p("Карта: EPSG:32635 (визуализация). Площи: EPSG:6933 (изчисление)."),
           Spacer(1,10)]
    header=["КАДНУМ","Роля","Зона","m²","%","Източник / дата"]
    cells=[header]
    for item in records:
        cells.append([str(item["parcel_id"]),str(item["parcel_role"]),str(item["zone_code"]),
                      str(item["area_m2"]),str(item["parcel_percent"]),
                      str(item["zone_source"])+" / "+str(item.get("zone_source_date") or "ПРЕДСТОИ")])
    table=Table([[p(str(v)) for v in row] for row in cells],
                colWidths=[95,60,80,58,48,165],repeatRows=1,hAlign="LEFT")
    table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#e8f1ed")),
                               ("GRID",(0,0),(-1,-1),0.3,colors.grey),
                               ("VALIGN",(0,0),(-1,-1),"TOP"),
                               ("LEFTPADDING",(0,0),(-1,-1),4),
                               ("RIGHTPADDING",(0,0),(-1,-1),4)]))
    story.extend([table,Spacer(1,12),
                  p("Забележка: процентите са по двойка имот–зона и не се сумират при припокриващи се зони."),
                  p("Официално потвърждение на геометрията: ПРЕДСТОИ.")])
    for issue in batch["issues"]:
        story.append(p("Техническо предупреждение: "+str(issue)))
    doc.build(story)
    return output.getvalue()


def save_pdf(batch: dict, path: str | Path) -> Path:
    target=Path(path)
    target.write_bytes(build_pdf(batch))
    return target
