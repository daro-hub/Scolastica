import utils.file_manager as file_manager


def test_get_output_path_exact_match_no_prefix_collision(tmp_path, monkeypatch):
    monkeypatch.setattr(file_manager, "OUTPUT_DIR", tmp_path)

    out_a = file_manager.save_output(b"AAA", "report", ".txt")
    out_b = file_manager.save_output(b"BBB", "report", ".txt")

    # Old behavior matched on `output_id[:8] in f.name`, a substring check
    # that could return either file once uuids shared an 8-hex prefix.
    # Matching the full uuid means each id can only ever resolve to its
    # own file, regardless of how many outputs pile up.
    path_a = file_manager.get_output_path(out_a["id"])
    path_b = file_manager.get_output_path(out_b["id"])

    assert path_a.read_bytes() == b"AAA"
    assert path_b.read_bytes() == b"BBB"
    assert path_a != path_b


def test_get_output_display_name_strips_id_prefix(tmp_path, monkeypatch):
    monkeypatch.setattr(file_manager, "OUTPUT_DIR", tmp_path)
    out = file_manager.save_output(b"content", "My Deck", ".pptx")
    path = file_manager.get_output_path(out["id"])
    assert file_manager.get_output_display_name(out["id"], path) == "My Deck.pptx"


def test_get_output_path_missing_id_returns_none(tmp_path, monkeypatch):
    monkeypatch.setattr(file_manager, "OUTPUT_DIR", tmp_path)
    assert file_manager.get_output_path("does-not-exist") is None
