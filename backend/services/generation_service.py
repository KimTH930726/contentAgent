"""
Mock T2I Generation Service
실제 구현 시 Nano Banana 2 / Stable Diffusion / DALL-E API 호출로 교체하세요.
"""
import base64
import io
import random
from typing import Optional
from PIL import Image, ImageDraw, ImageFilter

from models.schemas import StyleDNA


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (80, 80, 120)
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
    )


def _create_brand_image(colors: list[tuple[int, int, int]], size: int = 512) -> Image.Image:
    """브랜드 컬러 팔레트로 추상 배경 이미지 생성 (bokeh gradient 스타일)"""
    # Dark base
    base_color = tuple(max(0, c // 4) for c in colors[0]) if colors else (20, 20, 40)
    img = Image.new("RGB", (size, size), base_color)
    draw = ImageDraw.Draw(img)

    # Place large blurred circles at varied positions
    positions = [
        (int(size * 0.25), int(size * 0.25)),
        (int(size * 0.75), int(size * 0.20)),
        (int(size * 0.50), int(size * 0.65)),
        (int(size * 0.15), int(size * 0.75)),
        (int(size * 0.85), int(size * 0.80)),
        (int(size * 0.60), int(size * 0.35)),
    ]

    radii = [
        int(size * 0.38),
        int(size * 0.32),
        int(size * 0.28),
        int(size * 0.22),
        int(size * 0.20),
        int(size * 0.18),
    ]

    for i, color in enumerate(colors[:6]):
        pos = positions[i % len(positions)]
        r = radii[i % len(radii)]
        draw.ellipse(
            [pos[0] - r, pos[1] - r, pos[0] + r, pos[1] + r],
            fill=color,
        )

    # Stack blur passes for soft bokeh
    for _ in range(6):
        img = img.filter(ImageFilter.GaussianBlur(radius=28))

    # Add subtle highlight spots
    draw2 = ImageDraw.Draw(img)
    for _ in range(4):
        cx = random.randint(size // 4, size * 3 // 4)
        cy = random.randint(size // 4, size * 3 // 4)
        hr = random.randint(20, 60)
        highlight = random.choice(colors) if colors else (200, 200, 255)
        bright = tuple(min(255, c + 80) for c in highlight)
        draw2.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=bright)

    img = img.filter(ImageFilter.GaussianBlur(radius=18))
    return img


async def generate_mock_image(prompt: str, style_dna: Optional[StyleDNA] = None) -> str:
    """
    프롬프트를 받아 브랜드 컬러 기반 추상 이미지를 생성합니다.

    실제 구현:
        response = requests.post(
            "https://api.nanob.ai/v1/generate",
            json={"prompt": prompt, "model": "nano-banana-2"},
        )
        return response.json()["image_base64"]
    """
    if style_dna and style_dna.color_palette:
        colors = [_hex_to_rgb(c) for c in style_dna.color_palette]
    else:
        colors = [(124, 58, 237), (37, 99, 235), (6, 182, 212), (168, 85, 247)]

    img = _create_brand_image(colors)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
