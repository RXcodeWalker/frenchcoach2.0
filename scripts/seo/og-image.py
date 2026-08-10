"""Generates public/og-image.png (1200x630) for social link previews.

Design source for the OG image — reuses the violet -> indigo gradient and "F"
mark from src/components/Navigation.tsx:35-42, on the #0D0D0F background from
src/index.css. Product name plus a one-line descriptor only: no fabricated
stats, no third-party branding.

Run manually when the design needs regenerating:
    python scripts/seo/og-image.py
Requires Pillow (transient install, not added to requirements.txt anywhere):
    pip install pillow
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
BG_COLOR = "#0D0D0F"
GRADIENT_START = (124, 58, 237)   # violet-electric #7C3AED
GRADIENT_END = (99, 102, 241)     # indigo-500 #6366F1
TEXT_COLOR = "#FFFFFF"
SUBTEXT_COLOR = "#94A3B8"         # slate-400

# Windows system fonts — adjust these paths if running on another machine.
TITLE_FONT_PATH = "C:/Windows/Fonts/seguibl.ttf"
BODY_FONT_PATH = "C:/Windows/Fonts/arialbd.ttf"

OUTPUT_PATH = Path(__file__).resolve().parents[2] / "public" / "og-image.png"


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_mark(img: Image.Image, x: int, y: int, size: int) -> None:
    mark = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mark_draw = ImageDraw.Draw(mark)
    for row in range(size):
        t = row / size
        color = lerp_color(GRADIENT_START, GRADIENT_END, t)
        mark_draw.line([(0, row), (size, row)], fill=color)

    radius = round(size * 0.28)
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    mark.putalpha(mask)

    img.paste(mark, (x, y), mark)

    letter_font = ImageFont.truetype(TITLE_FONT_PATH, round(size * 0.56))
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), "F", font=letter_font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (x + size / 2 - text_w / 2 - bbox[0], y + size / 2 - text_h / 2 - bbox[1]),
        "F",
        font=letter_font,
        fill=TEXT_COLOR,
    )


def main() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    mark_size = 96
    mark_x = 100
    mark_y = 140
    draw_mark(img, mark_x, mark_y, mark_size)

    title_font = ImageFont.truetype(TITLE_FONT_PATH, 64)
    subtitle_font = ImageFont.truetype(BODY_FONT_PATH, 32)

    draw.text((mark_x, mark_y + mark_size + 40), "FrenchCoach", font=title_font, fill=TEXT_COLOR)
    draw.text(
        (mark_x, mark_y + mark_size + 120),
        "AI-powered speaking practice for IGCSE French",
        font=subtitle_font,
        fill=SUBTEXT_COLOR,
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUTPUT_PATH, "PNG")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
