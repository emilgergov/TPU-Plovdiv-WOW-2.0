"""V26 dossier ZIP inventory, safe extraction, and cadastral ID candidates.

Does not infer leading parcels from arbitrary files. Leading parcels must be
confirmed by an expert against the 'Местоположение на ИП' notification section.
No data is sent to a server and no legal conclusion is generated.
"""
from __future__ import annotations
from io import BytesIO
from pathlib import PurePosixPath
import re
from zipfile import ZipFile, BadZipFile

CADASTRAL = re.compile(r"(?<![0-9.])([0-9]{5}\\.[0-9]+\\.[0-9]+)(?![0-9.])")
MAX_FILES = 2000
MAX_UNCOMPRESSED = 250 * 1024 * 1024
MAX_SINGLE = 80 * 1024 * 1024
TEXT_EXTENSIONS = {".txt", ".csv", ".md"}


def inspect_zip(data: bytes) -> dict:
    """Inventory ZIP bytes without extracting to disk or parsing Office/PDF files.

    Extract candidate IDs only from plain text. Other formats remain pending
    review until a trusted parser is integrated. Never auto-assign LEADING.
    """
    files = []
    issues = []
    candidates = {}
    total = 0
    try:
        with ZipFile(BytesIO(data)) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_FILES:
                raise ValueError("ZIP exceeds file-count limit")
            for info in infos:
                raw = info.filename.replace("\\", "/")
                path = PurePosixPath(raw)
                if (path.is_absolute() or ".." in path.parts or
                    not raw or "\x00" in raw or re.match(r"^[A-Za-z]:", raw)):
                    issues.append({"type": "UNSAFE_PATH", "path": raw})
                    continue
                if info.is_dir():
                    continue
                # Reject symbolic links and special Unix filesystem entries.
                mode = (info.external_attr >> 16) & 0o170000
                if mode not in (0, 0o100000):
                    issues.append({"type": "UNSAFE_FILE_TYPE", "path": raw})
                    continue
                total += info.file_size
                if info.file_size > MAX_SINGLE or total > MAX_UNCOMPRESSED:
                    raise ValueError("ZIP exceeds decompression limit")
                entry = {"path": raw, "size": info.file_size,
                         "status": "INVENTORIED_NOT_INTERPRETED"}
                if path.suffix.lower() in TEXT_EXTENSIONS:
                    with archive.open(info) as stream:
                        content = stream.read(MAX_SINGLE + 1)
                    if len(content) > MAX_SINGLE:
                        raise ValueError("ZIP text entry exceeds limit")
                    decoded = None
                    for encoding in ("utf-8-sig", "cp1251"):
                        try:
                            decoded = content.decode(encoding)
                            break
                        except UnicodeDecodeError:
                            pass
                    if decoded is not None:
                        ids = sorted(set(CADASTRAL.findall(decoded)))
                        entry["candidate_ids"] = ids
                        entry["status"] = "CANDIDATES_REQUIRE_EXPERT_REVIEW"
                        for cad in ids:
                            candidates.setdefault(cad, []).append(raw)
                files.append(entry)
    except BadZipFile as exc:
        raise ValueError("Invalid ZIP archive") from exc
    return {"schema": "V26_DOSSIER_INVENTORY_1", "files": files,
            "candidate_parcels": candidates, "issues": issues,
            "leading_parcels": [],
            "leading_parcels_status": "EXPERT_CONFIRMATION_REQUIRED",
            "legal_conclusion": "NOT_GENERATED"}
