#!/usr/bin/env python3
"""KT84-A: read-only diagnostics for hosted GIS and latest visual test.
Run locally: python3 tests/kt84_gis_delivery_probe.py --local
On CI: python3 tests/kt84_gis_delivery_probe.py --public
No data is modified, no secret is accessed, and this is NOT a browser acceptance.
"""
import argparse
import gzip
import json
import pathlib
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
GIS = ROOT / "v26-test" / "gis-data"
SITE = "https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0"
PREFIXES = ("parcels", "parcelgeom", "overlays", "overlapgeom")
EXPECTED = {"parcels": 67, "parcelgeom": 67, "overlays": 62, "overlapgeom": 62}


def local():
    errors = []
    manifest = json.loads((GIS / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("shards") != 258 or manifest.get("parcel_geometry") != 917418:
        errors.append("Manifest does not match approved 258-shard/917418-geometry contract")
    actual = {}
    for kind in PREFIXES:
        entries = sorted(GIS.glob(kind + "_??.json.gz"))
        actual[kind] = len(entries)
        if len(entries) != EXPECTED[kind]:
            errors.append(f"{kind}: expected {EXPECTED[kind]} shards, found {len(entries)}")
    for kind in ("parcels", "parcelgeom"):
        found = {p.name.split("_")[1].split(".")[0] for p in GIS.glob(kind + "_??.json.gz")}
        if kind == "parcels":
            cadastral = found
        elif found != cadastral:
            errors.append("Cadastral and geometry prefix sets differ")
    for kind in ("overlays", "overlapgeom"):
        found = {p.name.split("_")[1].split(".")[0] for p in GIS.glob(kind + "_??.json.gz")}
        if kind == "overlays":
            intersection = found
        elif found != intersection:
            errors.append("Overlay and overlay geometry prefix sets differ")
    if not intersection.issubset(cadastral):
        errors.append("Overlay prefixes not in cadastral prefix set")
    for name in ("parcelgeom_36.json.gz", "parcelgeom_56.json.gz", "parcels_36.json.gz"):
        item = GIS / name
        if not item.is_file():
            errors.append(f"Missing sample file: {name}")
            continue
        with item.open("rb") as handle:
            if handle.read(2) != b"\x1f\x8b":
                errors.append(f"Invalid gzip signature: {name}")
        try:
            with gzip.open(item, "rb") as handle:
                if not handle.read(100):
                    errors.append(f"Empty gzip content: {name}")
        except (OSError, EOFError) as exc:
            errors.append(f"Broken gzip {name}: {exc}")
    print(json.dumps({"stage": "repository_shards", "counts": actual, "errors": errors}, ensure_ascii=False))
    return not errors


def request(url, signature=None, json_manifest=False):
    req = urllib.request.Request(url, headers={
        "User-Agent": "KT84-GIS-read-only-diagnostics/1.0",
        "Range": "bytes=0-1023" if signature else "bytes=0-8191",
        "Cache-Control": "no-cache",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.status
            data = response.read(8192 if not signature else 1024)
            result = {"url": url, "http": status, "mime": response.headers.get("Content-Type", ""), "bytes_sampled": len(data)}
            if signature and not data.startswith(b"\x1f\x8b"):
                result["error"] = "GET did not return gzip content (possible HTML fallback)"
            if json_manifest:
                try:
                    manifest = json.loads(data)
                    if manifest.get("shards") != 258 or manifest.get("parcel_geometry") != 917418:
                        result["error"] = "Unexpected manifest"
                except (ValueError, UnicodeError):
                    result["error"] = "GET did not return valid manifest JSON"
            return result
    except urllib.error.HTTPError as exc:
        return {"url": url, "http": exc.code, "error": "HTTP failure"}
    except Exception as exc:
        return {"url": url, "error": type(exc).__name__ + ": " + str(exc)}


def public():
    checks = [
        request(SITE + "/v26-test/gis-data/manifest.json", json_manifest=True),
        request(SITE + "/v26-test/gis-data/parcelgeom_36.json.gz", signature=True),
        request(SITE + "/v26-test/gis-data/parcelgeom_56.json.gz", signature=True),
        request(SITE + "/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html"),
    ]
    errors = [x for x in checks if x.get("error") or x.get("http") not in (200, 206)]
    print(json.dumps({"stage": "published_http_get", "checks": checks, "ok": not errors}, ensure_ascii=False, indent=2))
    return not errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--local", action="store_true")
    group.add_argument("--public", action="store_true")
    args = parser.parse_args()
    sys.exit(0 if (local() if args.local else public()) else 1)
