from pipeline.grounding import annotate_grounding, grounding_score

SOURCE = (
    "Sustainable tourism protects natural and cultural resources for future generations. "
    "Globalisation increased the number of people who can afford to travel abroad."
)


def test_verbatim_text_is_fully_grounded():
    text = "Sustainable tourism protects natural and cultural resources for future generations."
    assert grounding_score(text, SOURCE) == 1.0


def test_invented_text_scores_low():
    text = "The moon landing was faked by a secret government agency in 1969."
    assert grounding_score(text, SOURCE) < 0.5


def test_short_heading_is_not_penalized():
    # Fewer than MIN_WORDS_FOR_CHECK words — a slide heading the operator
    # writes themselves, not lifted prose. Must not be flagged just for
    # sharing no 4-grams with the source.
    assert grounding_score("Step 1: Tourism", SOURCE) == 1.0


def test_empty_source_fails_open():
    assert grounding_score("Anything at all, really, going on here", "") == 1.0


def test_annotate_grounding_flags_ungrounded_variant():
    sections = [
        {
            "section_index": 0,
            "variants": [
                {
                    "variant_index": 0,
                    "placeholder_fills": {
                        "15": {
                            "type": "text",
                            "content": "Sustainable tourism protects natural and cultural resources.",
                        }
                    },
                },
                {
                    "variant_index": 1,
                    "placeholder_fills": {
                        "15": {
                            "type": "text",
                            "content": "Aliens secretly built every ancient pyramid on Earth long ago.",
                        }
                    },
                },
            ],
        }
    ]
    annotate_grounding(sections, SOURCE, threshold=0.5)

    grounded_variant, ungrounded_variant = sections[0]["variants"]
    assert grounded_variant["grounding"]["grounded"] is True
    assert ungrounded_variant["grounding"]["grounded"] is False
    assert ungrounded_variant["grounding"]["flagged_idx"] == ["15"]


def test_annotate_grounding_variant_with_no_text_fills_defaults_grounded():
    sections = [{"section_index": 0, "variants": [{"variant_index": 0, "placeholder_fills": {
        "16": {"type": "image", "suggestion": "mountains"}
    }}]}]
    annotate_grounding(sections, SOURCE, threshold=0.5)
    assert sections[0]["variants"][0]["grounding"]["grounded"] is True
