# V26 — единен GitHub приемателен тест

## 1. Технически тест (вече подготвен)
Workflow: [V26 isolated zone overlay tests](../../actions/workflows/v26-zone-overlay.yml).

При push в изолирания клон се изпълняват 31 синтетични теста, след което се генерира пакет `v26-synthetic-evidence` (HTML + независим векторен PDF + JSON). Изтегля се от страницата на конкретното успешно GitHub Actions изпълнение. Това НЕ е проверка с действителни защитени зони.

## 2. Реални ГИС данни (защитен канал)
Workflow: `.github/workflows/v26-private-real-gis.yml`.

**Той умишлено се изпълнява само в PRIVATE repository.** Публично GitHub хранилище/Actions не е безопасно място за ZIP преписки, временни подписани URL или документи с лични данни.

Необходим вход: ZIP с точно два файла, без вложени папки:
- `parcels.geojson`: WGS84 EPSG:4326 GeoJSON FeatureCollection; всеки Feature е Polygon/MultiPolygon, properties: `KADNUM`, `role` (`LEADING` / `SUPPORTING` / `UNCONFIRMED`).
- `zones.geojson`: WGS84 EPSG:4326 GeoJSON FeatureCollection; всеки Feature е Polygon/MultiPolygon, properties: `zone_code`, `source`, `source_date`.

Източникът, датата и ролята на имота трябва да бъдат проследими и експертно потвърдени. Не се приема възстановяване на зона по архивни пресичания.

**Не се качва SNAP_BG(1).7z в публичното repo.** Архивът трябва първо да се обработи в контролираната среда и да се извлече само нужният GeoJSON набор. Този експорт НЕ е направен към момента.

За PRIVATE repository се настройват secrets `V26_GIS_BUNDLE_URL` (защитен временен HTTPS URL към подготвения ZIP) и `V26_GIS_BUNDLE_SHA256` (SHA256 на ZIP). Workflow изтегля и проверява хеша, прави реална ГИС карта/PDF/JSON и съхранява резултатите като частен Actions artifact само 1 ден.

## 3. Приемане
Технически PASS изисква реален успешен GitHub Actions run и проверен PDF. Реален GIS PASS изисква валидирани входни геометрии, съпоставка на площите и визуално потвърждение на картата. Докато това не е изпълнено: **ПРЕДСТОИ**.

Защитените `main`, WOW и публикуваните страници не се променят.
