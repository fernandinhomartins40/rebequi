#!/usr/bin/env python3
import argparse
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


def polygon_to_bbox(value):
    points = normalize_polygon(value)
    if not points:
        return None

    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return {
        "x0": int(min(xs)),
        "y0": int(min(ys)),
        "x1": int(max(xs)),
        "y1": int(max(ys)),
    }


def parse_predict_result(result):
    lines = []

    for entry in result or []:
        payload = entry.get("res") if isinstance(entry, dict) else getattr(entry, "res", None)
        if not isinstance(payload, dict):
            continue

        texts = list(payload.get("rec_texts") or [])
        scores = list(payload.get("rec_scores") or [])
        boxes = payload.get("rec_polys") or payload.get("dt_polys") or payload.get("rec_boxes") or []

        for index, text in enumerate(texts):
            cleaned = normalize_text(text)
            if not cleaned:
                continue

            score = float(scores[index]) if index < len(scores) else 0.0
            box = boxes[index] if index < len(boxes) else None
            lines.append(
                {
                    "text": cleaned,
                    "confidence": round(score * 100, 2),
                    "bbox": polygon_to_bbox(box),
                }
            )

    return lines


def parse_legacy_result(result):
    lines = []
    entries = result

    if isinstance(result, list) and len(result) == 1 and isinstance(result[0], list):
        entries = result[0]

    for entry in entries or []:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue

        box = entry[0]
        text_conf = entry[1]

        if not isinstance(text_conf, (list, tuple)) or len(text_conf) < 2:
            continue

        cleaned = normalize_text(text_conf[0])
        if not cleaned:
            continue

        lines.append(
            {
                "text": cleaned,
                "confidence": round(float(text_conf[1]) * 100, 2),
                "bbox": polygon_to_bbox(box),
            }
        )

    return lines


def build_ocr(lang):
    from paddleocr import PaddleOCR

    return PaddleOCR(
        lang=lang,
        use_doc_orientation_classify=True,
        use_doc_unwarping=True,
        use_textline_orientation=True,
        text_rec_score_thresh=0.0,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--image")
    parser.add_argument("--lang", default="latin")
    args = parser.parse_args()

    if args.check:
        from paddleocr import PaddleOCR  # noqa: F401

        print(json.dumps({"ok": True}))
        return 0

    if not args.image:
        raise ValueError("Missing --image parameter")

    ocr = build_ocr(args.lang)
    lines = []

    if hasattr(ocr, "predict"):
        lines = parse_predict_result(ocr.predict(args.image))

    if not lines and hasattr(ocr, "ocr"):
        lines = parse_legacy_result(ocr.ocr(args.image, cls=True))

    text = "\n".join(line["text"] for line in lines)
    confidence = round(sum(line["confidence"] for line in lines) / len(lines), 2) if lines else 0

    print(
        json.dumps(
            {
                "text": text,
                "confidence": confidence,
                "source": "hybrid",
                "lines": lines,
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        sys.stderr.write(f"{type(error).__name__}: {error}\n")
        raise SystemExit(1)
