# КТ77-02.2 — NatDA 2026 v24: технически preflight и кадастрален метричен контрол
Дата: 07.11.2026; само четене на оригинални архиви, без модификация на GIS и генераторите.

## Официален кандидат (проверено в EEA metadata)
- EEA NatDA dataset v24.00, creation 01.07.2026, publication 10.07.2026, temporal 2025–2026.
- Идентификатор / DOI: https://doi.org/10.2909/028003e7-7585-4d69-92fc-7f81e0cc2340
- Full `NatDA_2026_v01_public` and Europe `NatDA_2026_v01_public_EuropeEPSG3035`, both offered in GeoPackage and FileGDB.
- Official 2026 download directory via https://sdi.eea.europa.eu/data/028003e7-7585-4d69-92fc-7f81e0cc2340; EEA website reports **4.1 GB** for all files.
- Complementary data: DesignatedArea.csv, DesignationType.csv. Tabular DOI https://doi.org/10.2909/e92c2b84-abee-4da2-b3fe-5be5f0f91066; downloadable directory ~59.2 MB.
- EEA published ArcGIS REST map service **NatDAv24** confirms spatial Bulgarian coverage, polygons, countryCode, natDACountryCode, siteName, nationalId, designationTypeCode, iucnCategory, designatedAreaType, siteArea, legalFoundationDate, metadata and spatial resolution fields:
  https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/NatDAv24_Dyna_WM/MapServer/4
- WARNING: REST map layer reprojected into Web Mercator EPSG:3857 for rendering. The **downloaded GeoPackage** is the preferred original source for intersection, NOT rendered WMS or JPEG tiles.

## Ограничение при реалния достъп
Изтеглянето на EEA GeoPackage/GDB **не успя в тази изпълнителна среда** поради забранен изходящ DNS/мрежов достъп. Опитани официалният WebDAV и официалният ArcGIS REST JSON endpoint. Уеб проверката на метаданните е успешна, но самите български полигонови координати НЕ са получени.
**Няма изпълнен и няма заявен като PASS Intersection ПИ × ЗТ**. Не са броени полигони ЗТ и не са доказани точните им категории или площи.

## Преизползване на кадастъра — реален метричен контрол
Източник: Library `/TPU_Plovdiv_WOW/V26_FULL_GEOMETRY_100_PERCENT_2026-10-27.zip`, вътре `GEOMETRY_MANIFEST.json` и compressed `parcelgeom_*.json.gz`, original source regional GDB.
- `GEOMETRY_MANIFEST.json`: parcelgeom=917418, overlapgeom=181154, parcelgeom 46 chunks; изнесена геометрия EPSG:4326.
- В реалните записани JSON геометрии са намерени четирите еталонни имота. Използвани shapely geometry validity и pyproj преобразуване EPSG:4326→EPSG:3035 и EPSG:4326→EPSG:32635 (always_xy).
- Всички четири геометрии са валидни MultiPolygon.

| ПИ | Geometry valid | Площ в EPSG:3035, кв. м | Площ в EPSG:32635, кв. м |
|---|---|---:|---:|
| 36676.129.457 | true | 16609.72 | 16609.20 |
| 56784.13.102 | true | 3434.92 | 3434.97 |
| 56784.13.105 | true | 138.76 | 138.77 |
| 56784.13.106 | true | 44.34 | 44.34 |

Забележка: площи от различни картографски проекции имат малки различия поради проекционните изкривявания и не се приемат за доказателство за точни регистрови площи. EPSG:3035 е европейска equal-area проекция, а EPSG:32635 е UTM зона 35N. За реалната ГИС архитектура се избира единна метрична методика и се валидират резултатите спрямо изходните данни и националните актове.

## Оценка
- **EEA publication/format/v24 — PASS**
- **BG coverage/official hosted service availability — PASS (metadata only)**
- **existing parcel source geometry/CRS transform — PASS (4 of 4 sample parcels)**
- **download and inspection of EEA Bulgaria polygons — NOT EXECUTED (network blocker)**
- **classification by Bulgaria's national ZZT protected territories — NOT EXECUTED**
- **GIS overlay PI×ZT + percentages — NOT EXECUTED**
- **legal registry/acts matching — NOT EXECUTED**
- **Decision on integration — PENDING (NO CHANGE)**

## Следващата техническа операция
Получаване на пълния 2026 European GeoPackage file (не на всички 4.1 GB файлове), или надежден ограничен експорт само на BG feature-ите от официалната NatDAv24 REST услуга, с метаданни и CRS. Проверка на BG категории и национални идентификатори, импорт в изолирана временна среда, тест overlay 4 ПИ и допълнителни 3 геометрични класа, QA за площ и топология. След това отчет и отделно одобрение преди присъединяване към ГИС архива.

## Не променяй
КТ77-01 R13; V27.26; код за GIS, PDF1, PDF2, AI, Word; кадастрални сегменти; SNAP_BG; еталонни DOCX.
