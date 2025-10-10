#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate ATT&CK tags from the public MITRE ATT&CK STIX dataset.

Historically this script expected a git submodule checkout of the
``mitreattack-python`` project and executed one of its helper utilities
directly from disk.  The repository no longer vendors that submodule, so we now
fetch the dataset from MITRE's public STIX repository instead.  The downloaded
payload is cached locally to support air-gapped executions.

The generated ``attackTagsList.tags`` file is sorted to provide a stable output
order suitable for committing into the monorepo.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, List

import requests


DATA_DIR = Path(__file__).resolve().parent
CACHE_PATH = DATA_DIR / "enterprise-attack.json"
OUTPUT_PATH = DATA_DIR / "attackTagsList.tags"
STIX_URL = (
    "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/"
    "enterprise-attack/enterprise-attack.json"
)


def _load_stix_bundle() -> dict:
    """Download the ATT&CK STIX bundle (with a cached fallback)."""

    try:
        response = requests.get(STIX_URL, timeout=60)
        response.raise_for_status()
    except requests.RequestException as exc:
        if CACHE_PATH.exists():
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        raise RuntimeError(
            "Unable to download the MITRE ATT&CK dataset and no cached copy was "
            "found. Check your network connectivity or manually download "
            f"{STIX_URL} to {CACHE_PATH}."
        ) from exc

    CACHE_PATH.write_text(response.text, encoding="utf-8")
    return response.json()


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


def main() -> None:
    bundle = _load_stix_bundle()
    tag_entries = sorted(_iter_attack_tags(bundle))
    OUTPUT_PATH.write_text("\n".join(tag_entries) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
