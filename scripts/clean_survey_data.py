from __future__ import annotations

import argparse
import html
import json
import math
import posixpath
import re
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zipfile import ZipFile
import xml.etree.ElementTree as ET


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

METADATA_HEADERS = {
    "序号",
    "提交答卷时间",
    "所用时间",
    "来源",
    "来源详情",
    "来自IP",
    "总分",
}

SKIP_MARKER = "(跳过)"
EMPTY_MARKER = "(空)"
MULTI_DELIMITER = "┋"
RANK_DELIMITER = "→"

PUBLIC_TEXT_VALUE_QUESTIONS = {
    "2025-Q01",
}

# Text questions with downstream song-name extraction (word cloud). After regenerating
# aggregate-*.json with this script, re-run the extractor to re-populate result.counts:
#   python scripts/extract_q17_song_mentions.py
SONG_CLOUD_QUESTIONS = {
    "2026-Q17",
}

TEXT_DETAIL_LIMIT = 0

QUESTION_2026_KIND_OVERRIDES = {
    1: "single",
    2: "single",
    3: "multi",
    4: "multi",
    5: "single",
    6: "single",
    7: "ranking_order",
    8: "multi",
    9: "single",
    10: "single",
    11: "single",
    12: "multi",
    13: "multi",
    14: "text",
    15: "single",
    16: "single",
    17: "text",
    18: "single",
    19: "single",
    20: "single",
    21: "single",
    22: "single",
    23: "multi",
    24: "single",
    25: "multi",
    26: "single",
    27: "single",
    28: "multi",
    29: "single",
    30: "multi",
    31: "single",
    32: "single",
    33: "single",
    34: "single",
    35: "single",
    36: "single",
    37: "text",
    38: "text",
}


@dataclass
class QuestionDef:
    id: str
    year: int
    number: int
    title: str
    kind: str
    source_type: str = ""
    notes: list[str] | None = None
    options: list[dict[str, Any]] | None = None
    headers: list[str] | None = None
    subfield: str | None = None

    def as_json(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "year": self.year,
            "number": self.number,
            "title": self.title,
            "kind": self.kind,
        }
        if self.source_type:
            data["sourceType"] = self.source_type
        if self.notes:
            data["notes"] = self.notes
        if self.options:
            data["options"] = self.options
        if self.headers:
            data["headers"] = self.headers
        if self.subfield:
            data["subfield"] = self.subfield
        return data


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = html.unescape(str(value)).replace("\r\n", "\n").replace("\r", "\n")
    return text.strip()


def normalize_option_label(value: str) -> str:
    label = normalize_text(value)
    label = re.sub(r"^[\u25cb\u25a1]\s*", "", label)
    label = re.sub(r"^\[\s*\]\s*", "", label)
    label = re.sub(r"_+", "", label)
    label = re.sub(r"\s+", " ", label).strip()
    label = re.sub(r"[，,、]?\s*如$", "", label).strip()
    if label.startswith("其他"):
        return "其他"
    return label


def classify_marker(value: Any) -> tuple[str, str]:
    raw = normalize_text(value)
    if raw == "":
        return "blank", raw
    if raw == SKIP_MARKER:
        return "skipped_by_logic", raw
    if raw == EMPTY_MARKER:
        return "empty_marker", raw
    return "answered", raw


def parse_choice_token(token: str) -> dict[str, Any]:
    raw = normalize_text(token)
    match = re.match(r"^(.*?)\u3016(.*)\u3017$", raw)
    if match:
        label = normalize_option_label(match.group(1))
        detail = normalize_text(match.group(2))
        return {"label": label, "detail": detail, "raw": raw}
    return {"label": normalize_option_label(raw), "raw": raw}


def split_multi_value(value: str) -> list[dict[str, Any]]:
    return [parse_choice_token(part) for part in value.split(MULTI_DELIMITER) if normalize_text(part)]


def safe_int(value: Any) -> int | None:
    text = normalize_text(value)
    if not re.fullmatch(r"-?\d+", text):
        return None
    return int(text)


def safe_float(value: Any) -> float | None:
    text = normalize_text(value)
    if not re.fullmatch(r"-?\d+(\.\d+)?", text):
        return None
    return float(text)


def col_to_idx(col: str) -> int:
    idx = 0
    for ch in col:
        idx = idx * 26 + ord(ch) - 64
    return idx


def read_shared_strings(zf: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    values: list[str] = []
    for si in root.findall("a:si", NS):
        values.append("".join(t.text or "" for t in si.findall(".//a:t", NS)))
    return values


def resolve_sheet_paths(zf: ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("rel:Relationship", NS)}
    sheets: list[tuple[str, str]] = []
    for sheet in workbook.findall("a:sheets/a:sheet", NS):
        rid = sheet.attrib.get(f"{{{NS['r']}}}id")
        target = relmap[rid]
        if target.startswith("/"):
            path = target.lstrip("/")
        else:
            path = posixpath.normpath(posixpath.join("xl", target))
        sheets.append((sheet.attrib.get("name", ""), path))
    return sheets


def read_xlsx_rows(path: Path) -> list[dict[str, str]]:
    with ZipFile(path) as zf:
        shared = read_shared_strings(zf)
        sheet_name, sheet_path = resolve_sheet_paths(zf)[0]
        root = ET.fromstring(zf.read(sheet_path))

    row_values: list[dict[int, str]] = []
    max_col = 0
    for row in root.findall("a:sheetData/a:row", NS):
        values: dict[int, str] = {}
        for cell in row.findall("a:c", NS):
            ref = cell.attrib.get("r", "")
            match = re.match(r"([A-Z]+)(\d+)", ref)
            col = col_to_idx(match.group(1)) if match else len(values) + 1
            max_col = max(max_col, col)
            cell_type = cell.attrib.get("t")
            node_v = cell.find("a:v", NS)
            node_is = cell.find("a:is", NS)
            text = ""
            if cell_type == "s" and node_v is not None and node_v.text is not None:
                text = shared[int(node_v.text)]
            elif cell_type == "inlineStr" and node_is is not None:
                text = "".join(t.text or "" for t in node_is.findall(".//a:t", NS))
            elif node_v is not None and node_v.text is not None:
                text = node_v.text
            values[col] = normalize_text(text)
        if values:
            row_values.append(values)

    if not row_values:
        return []
    headers = [row_values[0].get(i, "") for i in range(1, max_col + 1)]
    records: list[dict[str, str]] = []
    for row in row_values[1:]:
        record = {headers[i - 1]: row.get(i, "") for i in range(1, max_col + 1) if headers[i - 1]}
        if any(value for value in record.values()):
            records.append(record)
    return records


def read_xlsx_headers(path: Path) -> list[str]:
    rows = read_xlsx_rows_with_header(path)
    return rows[0] if rows else []


def read_xlsx_rows_with_header(path: Path) -> list[list[str]]:
    with ZipFile(path) as zf:
        shared = read_shared_strings(zf)
        sheet_name, sheet_path = resolve_sheet_paths(zf)[0]
        root = ET.fromstring(zf.read(sheet_path))

    rows: list[dict[int, str]] = []
    max_col = 0
    for row in root.findall("a:sheetData/a:row", NS):
        values: dict[int, str] = {}
        for cell in row.findall("a:c", NS):
            ref = cell.attrib.get("r", "")
            match = re.match(r"([A-Z]+)(\d+)", ref)
            col = col_to_idx(match.group(1)) if match else len(values) + 1
            max_col = max(max_col, col)
            cell_type = cell.attrib.get("t")
            node_v = cell.find("a:v", NS)
            node_is = cell.find("a:is", NS)
            text = ""
            if cell_type == "s" and node_v is not None and node_v.text is not None:
                text = shared[int(node_v.text)]
            elif cell_type == "inlineStr" and node_is is not None:
                text = "".join(t.text or "" for t in node_is.findall(".//a:t", NS))
            elif node_v is not None and node_v.text is not None:
                text = node_v.text
            values[col] = normalize_text(text)
        if values:
            rows.append(values)
    return [[row.get(i, "") for i in range(1, max_col + 1)] for row in rows]


def extract_docx_paragraphs(path: Path) -> list[str]:
    with ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", NS):
        parts: list[str] = []
        for node in para.iter():
            if node.tag == f"{{{NS['w']}}}t":
                parts.append(node.text or "")
            elif node.tag == f"{{{NS['w']}}}tab":
                parts.append("\t")
            elif node.tag == f"{{{NS['w']}}}br":
                parts.append("\n")
        text = normalize_text("".join(parts))
        if text:
            paragraphs.append(text)
    return paragraphs


def infer_kind_from_2025_type(source_type: str, options: list[dict[str, Any]]) -> str:
    if "多选" in source_type:
        return "multi"
    if "排序" in source_type:
        return "ranking"
    if "比重" in source_type:
        return "ratio"
    if "填空" in source_type:
        return "text"
    if "单选" in source_type:
        option_labels = [opt["label"] for opt in options]
        if option_labels and all(re.fullmatch(r"\d+", label) for label in option_labels):
            return "rating"
        return "single"
    return "text"


def parse_2025_questions(docx_path: Path) -> list[QuestionDef]:
    paragraphs = extract_docx_paragraphs(docx_path)
    question_re = re.compile(r"^(\d+)\.\s*(.*?)\s*(\[(.*?)\])?\s*(\*)?$")
    parsed: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for text in paragraphs:
        match = question_re.match(text)
        if match:
            if current:
                parsed.append(current)
            current = {
                "number": int(match.group(1)),
                "title": normalize_text(match.group(2)),
                "source_type": normalize_text(match.group(4) or ""),
                "notes": [],
                "options": [],
            }
            continue
        if current is None:
            continue
        if set(text) <= {"_"}:
            continue
        stripped = text.lstrip()
        if stripped.startswith("\u25cb") or stripped.startswith("\u25a1") or stripped.startswith("[ ]"):
            label = normalize_option_label(stripped)
            current["options"].append(
                {
                    "code": len(current["options"]) + 1,
                    "label": label,
                    "raw": stripped,
                    "hasDetail": "____" in stripped or stripped.startswith("\u25cb其他") or stripped.startswith("\u25a1其他"),
                }
            )
        else:
            current["notes"].append(text)
    if current:
        parsed.append(current)

    questions: list[QuestionDef] = []
    for item in parsed:
        kind = infer_kind_from_2025_type(item["source_type"], item["options"])
        questions.append(
            QuestionDef(
                id=f"2025-Q{item['number']:02d}",
                year=2025,
                number=item["number"],
                title=item["title"],
                kind=kind,
                source_type=item["source_type"],
                notes=item["notes"],
                options=item["options"],
            )
        )
    return questions


def question_number_from_header(header: str) -> int | None:
    match = re.match(r"^(\d+)[、.．]", normalize_text(header))
    return int(match.group(1)) if match else None


def strip_question_prefix(header: str) -> str:
    return re.sub(r"^\d+[、.．]\s*", "", normalize_text(header)).strip()


def extract_subfield(header: str) -> str | None:
    clean = normalize_text(header)
    paren = re.search(r"\(([^()]*)\)\s*$", clean)
    if paren:
        return normalize_option_label(paren.group(1))
    if "—" in clean:
        return normalize_option_label(clean.split("—")[-1])
    after_prefix = strip_question_prefix(clean)
    if "、" not in after_prefix and len(after_prefix) <= 18:
        return normalize_option_label(after_prefix)
    return None


def base_title_from_2025_header(header: str, questions: dict[int, QuestionDef]) -> str:
    number = question_number_from_header(header)
    if number in questions:
        return questions[number].title
    without_sub = re.sub(r"\([^()]*\)\s*$", "", normalize_text(header))
    without_sub = re.sub(r"—[^—]*$", "", without_sub)
    return strip_question_prefix(without_sub)


def build_2025_column_groups(headers: list[str], questions: list[QuestionDef]) -> dict[int, list[str]]:
    groups: dict[int, list[str]] = defaultdict(list)
    for header in headers:
        if header in METADATA_HEADERS:
            continue
        number = question_number_from_header(header)
        if number is not None:
            groups[number].append(header)
    return dict(groups)


def clean_single_2025(raw_value: Any, question: QuestionDef) -> dict[str, Any]:
    status, raw = classify_marker(raw_value)
    answer: dict[str, Any] = {"kind": question.kind, "status": status, "raw": raw}
    if status != "answered":
        return answer

    code = safe_int(raw)
    options = question.options or []
    if code is not None and 1 <= code <= len(options):
        answer["code"] = code
        answer["value"] = options[code - 1]["label"]
    else:
        answer["value"] = raw
        if code is not None:
            answer["code"] = code
            answer["warning"] = "unknown_option_code"
    return answer


def clean_text_answer(raw_value: Any, kind: str = "text") -> dict[str, Any]:
    status, raw = classify_marker(raw_value)
    answer: dict[str, Any] = {"kind": kind, "status": status, "raw": raw}
    if status == "answered":
        answer["value"] = raw
    return answer


def clean_ratio_2025(row: dict[str, str], headers: list[str], question: QuestionDef) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    status_counter = Counter()
    for header in headers:
        label = extract_subfield(header) or strip_question_prefix(header)
        status, raw = classify_marker(row.get(header, ""))
        status_counter[status] += 1
        number = safe_float(raw)
        fields[label] = {"status": status, "raw": raw, "value": number if number is not None else None}
    answered = any(field["status"] == "answered" for field in fields.values())
    return {
        "kind": question.kind,
        "status": "answered" if answered else "blank",
        "fields": fields,
        "statusCounts": dict(status_counter),
    }


def clean_multi_2025(row: dict[str, str], headers: list[str], question: QuestionDef) -> dict[str, Any]:
    selected: list[dict[str, Any]] = []
    field_status: dict[str, str] = {}
    saw_value = False
    for header in headers:
        label = extract_subfield(header) or strip_question_prefix(header)
        label = normalize_option_label(label)
        status, raw = classify_marker(row.get(header, ""))
        if raw:
            saw_value = True
        field_status[label] = status
        if status != "answered":
            continue
        if raw in {"0", "0.0"}:
            continue
        choice: dict[str, Any] = {"label": label, "raw": raw}
        if raw not in {"1", "1.0"}:
            choice["detail"] = raw
        selected.append(choice)
    return {
        "kind": question.kind,
        "status": "answered" if saw_value else "blank",
        "selected": selected,
        "fieldStatus": field_status,
    }


def clean_ranking_2025(row: dict[str, str], headers: list[str], question: QuestionDef) -> dict[str, Any]:
    ranks: list[dict[str, Any]] = []
    invalid: list[dict[str, str]] = []
    for header in headers:
        item = extract_subfield(header) or strip_question_prefix(header)
        status, raw = classify_marker(row.get(header, ""))
        if status != "answered":
            continue
        rank = safe_int(raw)
        if rank is None:
            invalid.append({"item": item, "raw": raw})
            continue
        ranks.append({"item": item, "rank": rank, "raw": raw})
    ranks.sort(key=lambda item: (item["rank"], item["item"]))
    answer: dict[str, Any] = {
        "kind": question.kind,
        "status": "answered" if ranks else "blank",
        "ranks": ranks,
    }
    if invalid:
        answer["invalid"] = invalid
    return answer


def clean_2025_rows(records: list[dict[str, str]], headers: list[str], questions: list[QuestionDef]) -> list[dict[str, Any]]:
    question_by_number = {question.number: question for question in questions}
    groups = build_2025_column_groups(headers, questions)
    cleaned_rows: list[dict[str, Any]] = []
    for index, row in enumerate(records, start=1):
        cleaned: dict[str, Any] = {"rowId": f"2025-{index:04d}", "year": 2025, "answers": {}}
        for number, group_headers in groups.items():
            question = question_by_number.get(number)
            if question is None:
                continue
            if question.kind == "multi":
                answer = clean_multi_2025(row, group_headers, question)
            elif question.kind == "ranking":
                answer = clean_ranking_2025(row, group_headers, question)
            elif question.kind == "ratio":
                answer = clean_ratio_2025(row, group_headers, question)
            elif question.kind in {"single", "rating"}:
                answer = clean_single_2025(row.get(group_headers[0], ""), question)
            else:
                answer = clean_text_answer(row.get(group_headers[0], ""), question.kind)
            cleaned["answers"][question.id] = answer
        cleaned_rows.append(cleaned)
    return cleaned_rows


def build_2026_questions(headers: list[str]) -> list[QuestionDef]:
    seen_numbers: Counter[int] = Counter()
    root_titles: dict[int, str] = {}
    questions: list[QuestionDef] = []
    for header in headers:
        if header in METADATA_HEADERS:
            continue
        number = question_number_from_header(header)
        if number is None:
            continue
        seen_numbers[number] += 1
        subfield = extract_subfield(header)
        prefixed_title = strip_question_prefix(header)
        if "—" in prefixed_title:
            title = normalize_text(prefixed_title.split("—")[0])
            root_titles[number] = title
        elif number in root_titles and re.match(r"^[^，。？！?]{1,24}$", prefixed_title):
            title = root_titles[number]
            subfield = subfield or normalize_option_label(prefixed_title)
        else:
            title = prefixed_title
            root_titles.setdefault(number, title)
        qid = f"2026-Q{number:02d}" if seen_numbers[number] == 1 else f"2026-Q{number:02d}-{seen_numbers[number]}"
        questions.append(
            QuestionDef(
                id=qid,
                year=2026,
                number=number,
                title=title,
                kind=QUESTION_2026_KIND_OVERRIDES.get(number, "text"),
                headers=[header],
                subfield=subfield,
            )
        )
    return questions


def clean_single_textual(raw_value: Any, kind: str) -> dict[str, Any]:
    status, raw = classify_marker(raw_value)
    answer: dict[str, Any] = {"kind": kind, "status": status, "raw": raw}
    if status == "answered":
        parsed = parse_choice_token(raw)
        answer["value"] = parsed["label"]
        if "detail" in parsed:
            answer["detail"] = parsed["detail"]
    return answer


def clean_multi_textual(raw_value: Any, kind: str = "multi") -> dict[str, Any]:
    status, raw = classify_marker(raw_value)
    answer: dict[str, Any] = {"kind": kind, "status": status, "raw": raw, "selected": []}
    if status != "answered":
        return answer
    answer["selected"] = split_multi_value(raw)
    return answer


def clean_ranking_textual(raw_value: Any) -> dict[str, Any]:
    status, raw = classify_marker(raw_value)
    answer: dict[str, Any] = {"kind": "ranking_order", "status": status, "raw": raw, "ranks": []}
    if status != "answered":
        return answer
    parts = [normalize_option_label(part) for part in raw.split(RANK_DELIMITER) if normalize_text(part)]
    answer["ranks"] = [{"item": item, "rank": idx + 1} for idx, item in enumerate(parts)]
    return answer


def clean_2026_rows(records: list[dict[str, str]], questions: list[QuestionDef]) -> list[dict[str, Any]]:
    cleaned_rows: list[dict[str, Any]] = []
    for index, row in enumerate(records, start=1):
        cleaned: dict[str, Any] = {"rowId": f"2026-{index:04d}", "year": 2026, "answers": {}}
        for question in questions:
            header = (question.headers or [""])[0]
            raw_value = row.get(header, "")
            if question.kind == "multi":
                answer = clean_multi_textual(raw_value)
            elif question.kind == "ranking_order":
                answer = clean_ranking_textual(raw_value)
            elif question.kind in {"single", "rating"}:
                answer = clean_single_textual(raw_value, question.kind)
            else:
                answer = clean_text_answer(raw_value, question.kind)
            cleaned["answers"][question.id] = answer
        cleaned_rows.append(cleaned)
    return cleaned_rows


def status_counts(rows: list[dict[str, Any]], qid: str) -> Counter[str]:
    counts: Counter[str] = Counter()
    for row in rows:
        answer = row["answers"].get(qid, {})
        counts[answer.get("status", "missing")] += 1
    return counts


def aggregate_single(rows: list[dict[str, Any]], question: QuestionDef) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    detail_count = 0
    unknown_codes: Counter[str] = Counter()
    for row in rows:
        answer = row["answers"].get(question.id, {})
        if answer.get("status") != "answered":
            continue
        value = answer.get("value")
        if value is not None:
            counts[str(value)] += 1
        if answer.get("detail"):
            detail_count += 1
        if answer.get("warning") == "unknown_option_code":
            unknown_codes[str(answer.get("raw", ""))] += 1
    return {
        "type": question.kind,
        "counts": counter_to_sorted_list(counts),
        "detailCount": detail_count,
        "unknownCodes": dict(unknown_codes),
    }


def aggregate_text(rows: list[dict[str, Any]], question: QuestionDef) -> dict[str, Any]:
    values: Counter[str] = Counter()
    lengths: list[int] = []
    for row in rows:
        answer = row["answers"].get(question.id, {})
        if answer.get("status") != "answered":
            continue
        text = normalize_text(answer.get("value", ""))
        if text:
            lengths.append(len(text))
            if question.id in PUBLIC_TEXT_VALUE_QUESTIONS:
                values[text] += 1
    payload: dict[str, Any] = {
        "type": "text",
        "answeredTextCount": len(lengths),
        "averageLength": round(statistics.mean(lengths), 2) if lengths else 0,
        "maxLength": max(lengths) if lengths else 0,
    }
    if values:
        payload["counts"] = counter_to_sorted_list(values)
    if TEXT_DETAIL_LIMIT > 0:
        payload["samples"] = []
    return payload


def aggregate_multi(rows: list[dict[str, Any]], question: QuestionDef) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    detail_counts: Counter[str] = Counter()
    selected_per_answer: list[int] = []
    for row in rows:
        answer = row["answers"].get(question.id, {})
        if answer.get("status") != "answered":
            continue
        selected = answer.get("selected", [])
        selected_per_answer.append(len(selected))
        for choice in selected:
            label = normalize_option_label(choice.get("label", ""))
            if label:
                counts[label] += 1
                if choice.get("detail"):
                    detail_counts[label] += 1
    return {
        "type": "multi",
        "counts": counter_to_sorted_list(counts),
        "detailCounts": counter_to_sorted_list(detail_counts),
        "averageSelected": round(statistics.mean(selected_per_answer), 2) if selected_per_answer else 0,
    }


def aggregate_ratio(rows: list[dict[str, Any]], question: QuestionDef) -> dict[str, Any]:
    values_by_field: dict[str, list[float]] = defaultdict(list)
    distributions: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        answer = row["answers"].get(question.id, {})
        for field, payload in answer.get("fields", {}).items():
            value = payload.get("value")
            if isinstance(value, (int, float)) and not math.isnan(value):
                values_by_field[field].append(float(value))
                distributions[field][str(int(value) if value.is_integer() else value)] += 1
    fields: dict[str, Any] = {}
    for field, values in values_by_field.items():
        fields[field] = {
            "average": round(statistics.mean(values), 2) if values else 0,
            "min": min(values) if values else None,
            "max": max(values) if values else None,
            "distribution": counter_to_sorted_list(distributions[field]),
        }
    return {"type": "ratio", "fields": fields}


def aggregate_ranking(rows: list[dict[str, Any]], question: QuestionDef) -> dict[str, Any]:
    # Borda score = sum of (max_rank + 1 - rank) per ranking; rank 1 -> max_rank pts, unranked -> 0.
    # max_rank depends on candidate count, so cross-year score values are NOT directly comparable.
    # scoreNormalized rebases to 0..1 (score / theoretical max with current candidate set), comparable
    # as long as rankedCount and maxRank are reported alongside.
    item_ranks: dict[str, list[int]] = defaultdict(list)
    top1: Counter[str] = Counter()
    top3: Counter[str] = Counter()
    scores: Counter[str] = Counter()
    max_rank = len(question.options or []) or 0
    for row in rows:
        answer = row["answers"].get(question.id, {})
        if answer.get("status") != "answered":
            continue
        for item in answer.get("ranks", []):
            label = normalize_option_label(item.get("item", ""))
            rank = item.get("rank")
            if not label or not isinstance(rank, int):
                continue
            item_ranks[label].append(rank)
            if rank == 1:
                top1[label] += 1
            if rank <= 3:
                top3[label] += 1
            if max_rank:
                scores[label] += max(max_rank + 1 - rank, 0)
    rows_out: list[dict[str, Any]] = []
    for item, ranks in item_ranks.items():
        ranked_count = len(ranks)
        score = scores[item]
        max_possible = ranked_count * max_rank if max_rank else 0
        rows_out.append(
            {
                "item": item,
                "rankedCount": ranked_count,
                "averageRank": round(statistics.mean(ranks), 2),
                "top1": top1[item],
                "top3": top3[item],
                "score": score,
                "scoreNormalized": round(score / max_possible, 4) if max_possible else 0,
            }
        )
    rows_out.sort(key=lambda item: (-item["score"], item["averageRank"], item["item"]))
    return {
        "type": question.kind,
        "items": rows_out,
        "maxRank": max_rank,
        "scoreNote": "score = Borda sum; scoreNormalized = score / (rankedCount * maxRank), 0..1; cross-year raw score not comparable due to different candidate counts.",
    }


def counter_to_sorted_list(counter: Counter[str]) -> list[dict[str, Any]]:
    return [
        {"label": label, "count": count}
        for label, count in sorted(counter.items(), key=lambda item: (-item[1], item[0]))
    ]


def aggregate_rows(rows: list[dict[str, Any]], questions: list[QuestionDef]) -> dict[str, Any]:
    question_payloads: list[dict[str, Any]] = []
    for question in questions:
        if question.kind == "multi":
            result = aggregate_multi(rows, question)
        elif question.kind in {"single", "rating"}:
            result = aggregate_single(rows, question)
        elif question.kind in {"ranking", "ranking_order"}:
            result = aggregate_ranking(rows, question)
        elif question.kind == "ratio":
            result = aggregate_ratio(rows, question)
        else:
            result = aggregate_text(rows, question)
        question_payloads.append(
            {
                "questionId": question.id,
                "number": question.number,
                "title": question.title,
                "kind": question.kind,
                "statusCounts": dict(status_counts(rows, question.id)),
                "result": result,
            }
        )
    return {"sampleCount": len(rows), "questions": question_payloads}


def build_cleaning_report(rows_by_year: dict[int, list[dict[str, Any]]], questions_by_year: dict[int, list[QuestionDef]]) -> dict[str, Any]:
    report: dict[str, Any] = {"years": {}}
    for year, rows in rows_by_year.items():
        q_payloads = []
        for question in questions_by_year[year]:
            counts = status_counts(rows, question.id)
            q_payloads.append(
                {
                    "questionId": question.id,
                    "number": question.number,
                    "title": question.title,
                    "kind": question.kind,
                    "statusCounts": dict(counts),
                }
            )
        report["years"][str(year)] = {"sampleCount": len(rows), "questions": q_payloads}
    return report


def find_default_sources() -> dict[str, Path]:
    root = Path.home() / "OneDrive"
    matches: dict[str, Path] = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        name = path.name
        if "298823196" in name and path.suffix.lower() == ".xlsx":
            matches["xlsx25"] = path
        elif "346464983" in name and path.suffix.lower() == ".xlsx":
            matches["xlsx26"] = path
        elif "2025" in name and path.suffix.lower() == ".docx":
            matches["doc25"] = path
    missing = {"xlsx25", "xlsx26", "doc25"} - matches.keys()
    if missing:
        raise FileNotFoundError(f"Could not locate source files: {', '.join(sorted(missing))}")
    return matches


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean Sakurazaka Chinese community survey data.")
    parser.add_argument("--doc25", type=Path)
    parser.add_argument("--xlsx25", type=Path)
    parser.add_argument("--xlsx26", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/survey"))
    parser.add_argument("--private-output", type=Path, default=Path("survey-private"))
    parser.add_argument("--write-private-rows", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    defaults = find_default_sources()
    doc25 = args.doc25 or defaults["doc25"]
    xlsx25 = args.xlsx25 or defaults["xlsx25"]
    xlsx26 = args.xlsx26 or defaults["xlsx26"]

    rows25_raw = read_xlsx_rows(xlsx25)
    headers25 = read_xlsx_rows_with_header(xlsx25)[0]
    rows26_raw = read_xlsx_rows(xlsx26)
    headers26 = read_xlsx_rows_with_header(xlsx26)[0]

    questions25 = parse_2025_questions(doc25)
    question_by_number25 = {question.number: question for question in questions25}
    groups25 = build_2025_column_groups(headers25, questions25)
    for number, headers in groups25.items():
        if number in question_by_number25:
            question_by_number25[number].headers = headers
            if question_by_number25[number].kind in {"multi", "ranking", "ratio"}:
                question_by_number25[number].options = question_by_number25[number].options or [
                    {"code": idx + 1, "label": extract_subfield(header) or strip_question_prefix(header)}
                    for idx, header in enumerate(headers)
                ]

    questions26 = build_2026_questions(headers26)

    clean25 = clean_2025_rows(rows25_raw, headers25, questions25)
    clean26 = clean_2026_rows(rows26_raw, questions26)

    aggregate25 = aggregate_rows(clean25, questions25)
    aggregate26 = aggregate_rows(clean26, questions26)
    report = build_cleaning_report({2025: clean25, 2026: clean26}, {2025: questions25, 2026: questions26})

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    manifest = {
        "generatedAt": generated_at,
        "sources": {
            "2025Questionnaire": doc25.name,
            "2025Responses": xlsx25.name,
            "2026Responses": xlsx26.name,
        },
        "outputs": {
            "questions2025": "questions-2025.json",
            "questions2026": "questions-2026.json",
            "aggregate2025": "aggregate-2025.json",
            "aggregate2026": "aggregate-2026.json",
            "cleaningReport": "cleaning-report.json",
        },
        "privacy": {
            "publicOutputs": "Aggregated data only; source IPs, submission timestamps, and raw free-text answers are not included.",
            "privateRows": "Use --write-private-rows to export anonymized row-level data into survey-private/, which is git-ignored.",
            "excludedSourceFields": sorted(METADATA_HEADERS),
        },
        "markerPolicy": {
            SKIP_MARKER: "Preserved as status=skipped_by_logic and excluded from option counts.",
            EMPTY_MARKER: "Preserved as status=empty_marker and excluded from option counts.",
            "otherWithDetail": "Values shaped like label〖detail〗 are split into label/detail; public aggregates count labels and detail presence only.",
        },
    }

    output = args.output
    write_json(output / "manifest.json", manifest)
    write_json(output / "questions-2025.json", [question.as_json() for question in questions25])
    write_json(output / "questions-2026.json", [question.as_json() for question in questions26])
    write_json(output / "aggregate-2025.json", aggregate25)
    write_json(output / "aggregate-2026.json", aggregate26)
    write_json(output / "cleaning-report.json", report)

    if args.write_private_rows:
        private_output = args.private_output
        write_json(private_output / "cleaned-2025-rows.json", clean25)
        write_json(private_output / "cleaned-2026-rows.json", clean26)

    print(json.dumps({
        "generatedAt": generated_at,
        "sampleCount2025": len(clean25),
        "sampleCount2026": len(clean26),
        "questionCount2025": len(questions25),
        "questionCount2026": len(questions26),
        "publicOutput": str(output),
        "privateRowsWritten": bool(args.write_private_rows),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
