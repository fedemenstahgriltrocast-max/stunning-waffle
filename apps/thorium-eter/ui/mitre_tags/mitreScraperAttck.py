#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate ATT&CK tags from the public MITRE ATT&CK STIX dataset.
Historically this script expected a git submodule checkout of the
``mitreattack-python`` project and executed one of its helper utilities
directly from disk.  The repository no longer vendors that submodule, so we now
fetch the dataset from MITRE's public STIX repository instead.  The downloaded
payload is cached locally to support air-gapped executions.
The generated ``attackTagsList.tags`` file is sorted to provide a stable output
order suitable for committing into the monorepo. The script also exposes a
small CLI so cached bundles can be refreshed on demand or consumed in offline
mode.
"""

from __future__ import annotations
import json
import argparse
from pathlib import Path
from typing import Iterable, List
from urllib.error import HTTPError, URLError
from urllib.request import urlopen
DATA_DIR = Path(__file__).resolve().parent
DEFAULT_CACHE_PATH = DATA_DIR / "enterprise-attack.json"
DEFAULT_OUTPUT_PATH = DATA_DIR / "attackTagsList.tags"
DEFAULT_STIX_URL = (
    "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/"
    "enterprise-attack/enterprise-attack.json"
)

def _load_stix_bundle(
    *,
    stix_url: str,
    cache_path: Path,
    force_refresh: bool,
    skip_download: bool,
) -> dict:
    """Download the ATT&CK STIX bundle (with a cached fallback)."""

    if cache_path.exists() and (skip_download or not force_refresh):
        try:
            return json.loads(cache_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            if skip_download:
                raise RuntimeError(
                    "Cached MITRE ATT&CK dataset is corrupted and offline mode is "
                    "enabled. Delete the cache or rerun without --offline."
                )
            # Fall through to refresh the corrupt cache.
            pass

    if skip_download:
        raise RuntimeError(
            "Offline mode requested but no cached MITRE ATT&CK dataset was found."
        )

    try:
        with urlopen(stix_url, timeout=60) as response:  # nosec B310 - trusted source
            payload = response.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError) as exc:
        if cache_path.exists():
            return json.loads(cache_path.read_text(encoding="utf-8"))
        raise RuntimeError(
            "Unable to download the MITRE ATT&CK dataset and no cached copy was "
            "found. Check your network connectivity or manually download "
            f"{stix_url} to {cache_path}."
        ) from exc

    cache_path.write_text(payload, encoding="utf-8")
    return json.loads(payload)
def _iter_attack_tags(bundle: dict) -> Iterable[str]:
    objects: List[dict] = bundle.get("objects", [])  # type: ignore[assignment]
    for obj in objects:
        if obj.get("type") != "attack-pattern":
            continue

        name = obj.get("name")
        external_id = None
        for ref in obj.get("external_references", []) or []:
            if ref.get("source_name") == "mitre-attack" and ref.get("external_id"):
                external_id = ref["external_id"]
                break

        kill_chain_phases = [
            phase.get("phase_name")
            for phase in obj.get("kill_chain_phases", []) or []
            if phase.get("kill_chain_name") == "mitre-attack"
            and phase.get("phase_name")
        ]

        if not name or not external_id or not kill_chain_phases:
            continue
        for tactic in kill_chain_phases:
            yield f"{tactic}::{name} {external_id}"
def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate MITRE ATT&CK tag list from the public STIX dataset."
    )
    parser.add_argument(
        "--stix-url",
        default=DEFAULT_STIX_URL,
        help="STIX bundle URL to download (default: %(default)s)",
    )
    parser.add_argument(
        "--cache-path",
        type=Path,
        default=DEFAULT_CACHE_PATH,
        help="Path where the downloaded bundle should be cached.",
    )
    parser.add_argument(
        "--output-path",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Location to write the generated tag list.",
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Always redownload the STIX bundle, ignoring any cached copy.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Skip downloading the bundle and rely solely on the cached copy.",
    )
    args = parser.parse_args()
    if args.offline and args.force_refresh:
        parser.error("--offline cannot be combined with --force-refresh")
    return args
def main() -> None:
    args = _parse_args()
    bundle = _load_stix_bundle(
        stix_url=args.stix_url,
        cache_path=args.cache_path,
        force_refresh=args.force_refresh,
        skip_download=args.offline,
    )
    tag_entries = sorted(_iter_attack_tags(bundle))
    args.output_path.write_text("\n".join(tag_entries) + "\n", encoding="utf-8")
if __name__ == "__main__":
    main()
