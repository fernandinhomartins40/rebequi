#!/usr/bin/env python3
"""
PaddleOCR bridge — compatible with PaddleOCR 2.x and 3.x.
"""
import argparse
import importlib.util
import inspect
import json
import sys


def normalize_text(value):
    return " ".join(str(value).split()).strip()


def normalize_polygon(value):
    if value is None:
        return None

    if hasattr(value, "tolist"):
        value = value.tolist()

    if not isinstance(value, (list, tuple)):
        return None

    points = []
    for point in value:
        if hasattr(point, "tolist"):
            point = point.tolist()
        if isinstance(point, (list, tuple)) and len(point) >= 2:
            points.append((float(point[0]), float(point[1])))

    return points or None


def ensure_sequence(value):
    if value is None:
        return []
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, (list, tuple)):
        return list(value)
    return [value]


def polygon_to_bbox(value):
    points = normalize_polygon(value)
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return {"x0": int(min(xs)), "y0": int(min(ys)), "x1": int(max(xs)), "y1": int(max(ys))}


# ─── Result parsers ───────────────────────────────────────────────────────────

def parse_predict_result(result):
    """Parse PaddleOCR 3.x predict() output."""
    lines = []
    if result is None:
        return lines

    for entry in ensure_sequence(result):
        # 3.x: entry may be a dict with "res" key or an object with .res attribute
        if isinstance(entry, dict):
            payload = entry.get("res") or entry
        else:
            payload = getattr(entry, "res", None) or entry

        if payload is None:
            continue

        # Extract arrays
        def get_field(obj, *keys):
            for k in keys:
                v = obj.get(k) if isinstance(obj, dict) else getattr(obj, k, None)
                if v is not None:
                    return v
            return None

        texts  = ensure_sequence(get_field(payload, "rec_texts", "texts"))
        scores = ensure_sequence(get_field(payload, "rec_scores", "scores"))
        boxes  = ensure_sequence(
            get_field(payload, "rec_polys", "dt_polys", "rec_boxes", "boxes")
        )

        for i, text in enumerate(texts):
            cleaned = normalize_text(text)
            if not cleaned:
                continue
            score = float(scores[i]) if i < len(scores) else 0.0
            box   = boxes[i] if i < len(boxes) else None
            lines.append({
                "text":       cleaned,
                "confidence": round(score * 100, 2),
                "bbox":       polygon_to_bbox(box),
            })

    return lines


def parse_legacy_result(result):
    """Parse PaddleOCR 2.x ocr() output."""
    lines = []
    entries = result

    # Legacy API wraps results in an extra list
    if isinstance(result, list) and len(result) == 1 and isinstance(result[0], list):
        entries = result[0]

    for entry in entries if entries is not None else []:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue

        box, text_conf = entry[0], entry[1]

        if not isinstance(text_conf, (list, tuple)) or len(text_conf) < 2:
            continue

        cleaned = normalize_text(text_conf[0])
        if not cleaned:
            continue

        lines.append({
            "text":       cleaned,
            "confidence": round(float(text_conf[1]) * 100, 2),
            "bbox":       polygon_to_bbox(box),
        })

    return lines


# ─── OCR builder ─────────────────────────────────────────────────────────────

def build_ocr(lang):
    from paddleocr import PaddleOCR

    # Introspect accepted constructor params to stay compatible across versions
    try:
        sig    = inspect.signature(PaddleOCR.__init__)
        params = set(sig.parameters.keys())
    except (ValueError, TypeError):
        params = set()

    kwargs = {"lang": lang}
    optional = {
        "use_doc_orientation_classify": True,
        "use_doc_unwarping":            True,
        "use_textline_orientation":     True,
        "text_rec_score_thresh":        0.0,
        # 3.x sometimes accepts show_log to suppress verbose output
        "show_log":                     False,
    }
    for key, val in optional.items():
        if key in params:
            kwargs[key] = val

    return PaddleOCR(**kwargs)


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--image")
    parser.add_argument("--lang", default="la")
    args = parser.parse_args()

    if args.check:
        if importlib.util.find_spec("paddleocr") is None:
            raise ImportError("paddleocr module not found")
        print(json.dumps({"ok": True}))
        return 0

    if not args.image:
        raise ValueError("Missing --image parameter")

    ocr   = build_ocr(args.lang)
    lines = []

    # Try modern predict() API first (3.x)
    if hasattr(ocr, "predict"):
        try:
            lines = parse_predict_result(ocr.predict(args.image))
        except Exception as exc:
            sys.stderr.write(f"predict() failed, trying legacy ocr(): {exc}\n")

    # Fall back to legacy ocr() API (2.x) if predict produced nothing
    if not lines and hasattr(ocr, "ocr"):
        lines = parse_legacy_result(ocr.ocr(args.image, cls=True))

    text       = "\n".join(line["text"] for line in lines)
    confidence = round(sum(line["confidence"] for line in lines) / len(lines), 2) if lines else 0

    print(json.dumps({
        "text":       text,
        "confidence": confidence,
        "source":     "hybrid",
        "lines":      lines,
    }, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        sys.stderr.write(f"{type(error).__name__}: {error}\n")
        raise SystemExit(1)
