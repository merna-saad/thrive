"""The index record must survive a JSON round trip.

`--report-only` rebuilds the report from `index.json` instead of reconverting
141 files. That is only safe if `from_dict` is a true inverse of `to_dict`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from convert import Record
from filename_parser import parse_filename

RECORDS = [
    Record(
        kind="offering",
        filename="MGTA 464 SQL and ETL (Perols) SU25 - FW.pdf",
        source_path="backend/data/syllabi/MGTA/MGTA 464 SQL and ETL (Perols) SU25 - FW.pdf",
        markdown_path="backend/data/syllabi_md/MGTA/MGTA 464 SQL and ETL (Perols) SU25 - FW.md",
        converted=True,
        characters=10149,
        pages=4,
        pages_without_text_layer=0,
        offering=parse_filename("MGTA 464 SQL and ETL (Perols) SU25 - FW.pdf").to_dict(),
    ),
    Record(
        kind="catalog",
        filename="Fall 2026 Rady Graduate Course Descriptions.docx",
        source_path="backend/data/syllabi/Course Descriptions/Fall 2026 Rady Graduate Course Descriptions.docx",
        markdown_path="backend/data/syllabi_md/Course Descriptions/Fall 2026 Rady Graduate Course Descriptions.md",
        converted=True,
        characters=36218,
    ),
    Record(
        kind="unparsed",
        filename="something unreadable.pdf",
        source_path="backend/data/syllabi/MGT/something unreadable.pdf",
        markdown_path=None,
        converted=False,
        characters=0,
        conversion_error="RuntimeError: boom",
        parse_error="no term code found",
    ),
]


@pytest.mark.parametrize("record", RECORDS, ids=[r.kind for r in RECORDS])
def test_record_survives_a_json_round_trip(record):
    assert Record.from_dict(json.loads(json.dumps(record.to_dict()))) == record


def test_offering_fields_are_flattened_into_the_record():
    """Consumers read `course_code` off the record, not off a nested object."""
    flat = RECORDS[0].to_dict()
    assert flat["course_code"] == "MGTA 464"
    assert flat["instructor"] == "Perols"
    assert flat["qualifier"] == "FW"
    assert "offering" not in flat


def test_paths_in_records_are_repo_relative():
    for record in RECORDS:
        assert not record.source_path.startswith("/")
        if record.markdown_path:
            assert not record.markdown_path.startswith("/")
