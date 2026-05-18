"""
One-off migration that populates aggregate-2026.json's 2026-Q17 result.counts
with song mention frequency, derived from the row-level answers in survey-private/.

The Q17 question is "2025 年你印象最深刻的是哪一首歌曲的演出". Answers are free-text
mixing Chinese / Japanese / English; each respondent typically writes "tour-venue +
song name". For a meaningful word cloud we extract SONG names by matching against a
canonical catalog (built from the official option lists in other song-related
questions, plus a curated set of Keyakizaka46 classics that appear in graduation
ceremony performances).

Run from project root:
    python scripts/extract_q17_song_mentions.py
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ROWS_FILE = PROJECT_ROOT / "survey-private" / "cleaned-2026-rows.json"
AGG_FILE = PROJECT_ROOT / "data" / "survey" / "aggregate-2026.json"
AGG_25_FILE = PROJECT_ROOT / "data" / "survey" / "aggregate-2025.json"


# Source questions whose option labels are official song names.
SONG_OPTION_QUESTIONS = {
    "2025": {"2025-Q04", "2025-Q05", "2025-Q06", "2025-Q07", "2025-Q08", "2025-Q09"},
    "2026": {"2026-Q15", "2026-Q16"},
}


# Manual additions: songs (Keyakizaka46-era or new Sakurazaka songs not in option
# lists) that respondents commonly mention. Map canonical -> aliases.
KEYAKIZAKA_ADDITIONS = {
    # Keyakizaka classics often heard at graduation ceremonies
    "二人セゾン": ["二人的季节", "二人saison", "两人季节", "二人季节"],
    "コンセントレーション": ["concentration"],
    "紫外線": ["紫外线"],
    "ノンアルコール": ["无酒精", "無酒精"],
    "青空が見えるまで": [],
    "黒い羊": ["黑羊", "黒羊"],
    "サイレントマジョリティー": ["silent majority", "沉默的大多数"],
    "不協和音": ["不协和音"],
    "風に吹かれても": [],
    "アンビバレント": ["ambivalent"],
    "W-KEYAKIZAKAの詩": [],
    "もう一曲 欲しいのかい？": [
        "もう一曲欲しいのかい", "もう一曲欲しいのか", "もう一曲ほしいのかい", "再来一曲"
    ],
    "夜空で一番輝いてる星の名前を僕は知らない": [
        "夜空中最亮的星星我不知道名字",
        "夜空で一番輝いてる星",
        "夜空中最亮的星星",
    ],
    "行かないで": [],
    "ずっと 春だったらなあ": [
        "ずっと春だったらなあ",
        "要是一直是春天就好了",
        "一直是春天",
    ],
    # New Sakurazaka songs (Backs / 2025 releases not yet in option lists)
    "紋白蝶が確か飛んでた": [
        "紋白蝶",
        "纹白蝶",
        "紋白蝶が確か飛んでた",
    ],
    "真夏に何か起きるのかしら": [
        "真夏大統領", "真夏大统领", "真夏に何か",
    ],
    "恋愛無双": ["恋爱无双"],
    "I will be": ["i will be"],
    "Anthem time": ["anthem time"],
    "Buddies": ["buddies"],
    "Plastic regret": ["plastic regret"],
    "Don't cut in line!": ["don't cut in line", "dont cut in line"],
    "On my way": ["on my way", "onmyway"],
    "One-way stairs": ["one-way stairs", "one way stairs"],
    "I'm in": ["i'm in", "im in"],
}


# Aliases for Sakurazaka catalog songs (handles kanji 系/係 variation, Chinese
# translations, casing for English titles).
SAKURAZAKA_ALIASES = {
    "摩擦係数": ["摩擦系数"],
    "偶然の答え": ["偶然的答案", "偶然之答", "偶然のこたえ"],
    "Addiction": ["addiction", "addition"],
    "Make or Break": ["make or break", "mark or break"],
    "I want tomorrow to come": ["i want tomorrow to come"],
    "UDAGAWA GENERATION": [
        "udagawa generation", "udagawa", "宇田川 generation", "宇田川",
        "udgn", "udgw",
    ],
    "Unhappy birthday構文": ["unhappy birthday構文", "unhappy birthday"],
    "Start over!": ["start over!", "start over"],
    "Nobody's fault": ["nobody's fault", "nobodys fault", "nobody's falut"],
    "TOKYO SNOW": ["tokyo snow"],
    "Cool": [],
    "Dead end": ["dead end"],
    "BAN": [],
    "Alter ego": ["alter ego", "alterego"],
    "Nightmare症候群": ["nightmare症候群"],
    "Nothing special": ["nothing special"],
    "なぜ 恋をして来なかったんだろう?": [
        "なぜ恋をして来なかったんだろう", "なぜ恋をして来なかったんだろう?",
        "naze恋", "naze 恋",
    ],
    "桜月": ["櫻月", "樱月"],
    "何歳の頃に戻りたいのか？": [
        "何歳の頃に戻りたいのか", "何歳の頃に戻りたいのか?",
        "何岁的时候想回去", "何岁",
    ],
    "流れ弾": ["流弾", "流弹"],
    "本質的なこと": ["本质的なこと", "本质的事情"],
    "油を注せ！": ["油を注せ", "油注", "油を注"],
    "マンホールの蓋の上": ["マンホールの蓋", "井盖", "井蓋"],
    "制服の人魚": ["制服人鱼", "制服美人鱼"],
    "承認欲求": ["承认欲求"],
    "港区パセリ": [
        "港区パセリ", "港区欧芹", "港区芹菜", "京阪 パセリ", "京阪パセリ",
        "港区欧芹菜", "港区西芹", "港区芹",
    ],
    "五月雨よ": ["五月雨"],
    "I'm in": ["i'm in", "im in"],
    "僕は僕を好きになれない": ["我无法喜欢自己", "僕は僕"],
}


def build_song_dict() -> dict[str, list[str]]:
    """Build canonical song -> [aliases (incl. canonical)] dict.

    Aliases stored as lowercased strings so matching is case-insensitive.
    Canonical key remains in original case for display.
    """
    with open(AGG_25_FILE, encoding="utf-8") as f:
        a25 = json.load(f)
    with open(AGG_FILE, encoding="utf-8") as f:
        a26 = json.load(f)

    catalog: set[str] = set()
    for q in a25["questions"]:
        if q["questionId"] in SONG_OPTION_QUESTIONS["2025"]:
            for c in q["result"].get("counts", []):
                catalog.add(c["label"])
    for q in a26["questions"]:
        if q["questionId"] in SONG_OPTION_QUESTIONS["2026"]:
            for c in q["result"].get("counts", []):
                catalog.add(c["label"])

    # Merge in Keyakizaka additions
    for canonical in KEYAKIZAKA_ADDITIONS:
        catalog.add(canonical)

    # Build final dict: canonical -> list of lowercased aliases including canonical itself
    song_dict: dict[str, list[str]] = {}
    for canonical in catalog:
        aliases = {canonical.lower()}
        for alias in SAKURAZAKA_ALIASES.get(canonical, []):
            aliases.add(alias.lower())
        for alias in KEYAKIZAKA_ADDITIONS.get(canonical, []):
            aliases.add(alias.lower())
        song_dict[canonical] = sorted(aliases, key=len, reverse=True)
    return song_dict


def extract_mentions(answers: list[str], song_dict: dict[str, list[str]]) -> Counter[str]:
    """For each answer, find all canonical songs whose aliases appear as substrings.
    Each song counted at most once per answer (no double-counting if mentioned twice).
    """
    # Sort songs by longest alias first, so we match more specific names before
    # shorter substrings that might be contained in longer ones.
    songs_by_len = sorted(
        song_dict.items(),
        key=lambda kv: max(len(a) for a in kv[1]),
        reverse=True,
    )
    counts: Counter[str] = Counter()
    for answer in answers:
        low = answer.lower()
        hit_in_this_answer: set[str] = set()
        for canonical, aliases in songs_by_len:
            for alias in aliases:
                # Skip aliases shorter than 2 chars to avoid noise (e.g., 'ban' as substring of 'banner')
                if len(alias) < 2:
                    continue
                if alias in low:
                    hit_in_this_answer.add(canonical)
                    break
        for s in hit_in_this_answer:
            counts[s] += 1
    return counts


def main() -> None:
    if not ROWS_FILE.exists():
        raise FileNotFoundError(f"Cannot find row-level data at {ROWS_FILE}. "
                                "Re-run clean_survey_data.py --write-private-rows first.")
    with open(ROWS_FILE, encoding="utf-8") as f:
        rows = json.load(f)

    answers = []
    for row in rows:
        a = row["answers"].get("2026-Q17") or {}
        if a.get("status") == "answered" and a.get("value"):
            answers.append(str(a["value"]).strip())

    song_dict = build_song_dict()
    counts = extract_mentions(answers, song_dict)

    # Coverage diagnostic
    matched_answers = sum(
        1 for ans in answers
        if any(alias in ans.lower() for aliases in song_dict.values() for alias in aliases if len(alias) >= 2)
    )

    # Sort counts (desc by count, then by canonical name)
    sorted_counts = [
        {"label": k, "count": v}
        for k, v in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]

    # Update aggregate-2026.json
    with open(AGG_FILE, encoding="utf-8") as f:
        agg = json.load(f)
    for q in agg["questions"]:
        if q["questionId"] == "2026-Q17":
            q["result"]["counts"] = sorted_counts
            q["result"]["extractionMethod"] = "song-dictionary substring match"
            q["result"]["matchedAnswerCount"] = matched_answers
            q["result"]["songCatalogSize"] = len(song_dict)
            break
    with open(AGG_FILE, "w", encoding="utf-8") as f:
        json.dump(agg, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Q17 song mentions extracted")
    print(f"  total answers:       {len(answers)}")
    print(f"  matched ≥1 song:     {matched_answers} ({matched_answers/max(len(answers),1)*100:.1f}%)")
    print(f"  unique songs hit:    {len(counts)}")
    print(f"  catalog size:        {len(song_dict)}")
    print(f"\nTop 15:")
    for entry in sorted_counts[:15]:
        print(f"  {entry['count']:>3}  {entry['label']}")


if __name__ == "__main__":
    main()
