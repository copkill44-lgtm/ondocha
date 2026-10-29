"""Check local HTML, CSS, and JavaScript asset references without dependencies."""

from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


def check_reference(reference, base):
    url = urlsplit(reference)
    if url.scheme or url.netloc or not url.path:
        return
    path = (ROOT / unquote(url.path.lstrip("/"))) if url.path.startswith("/") else (base / unquote(url.path))
    resolved = path.resolve()
    if not resolved.is_relative_to(ROOT) or not resolved.is_file():
        raise RuntimeError("Missing local asset: " + reference)


class PageReferences(HTMLParser):
    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        for attribute in ("src", "href"):
            if attributes.get(attribute):
                check_reference(attributes[attribute], ROOT)


def check_assets():
    PageReferences().feed((ROOT / "index.html").read_text(encoding="utf-8"))
    for path in (ROOT / "styles").glob("*.css"):
        text = path.read_text(encoding="utf-8")
        for reference in re.findall(r"url\(\s*['\"]?([^)'\"]+)", text):
            check_reference(reference.strip(), path.parent)
    for path in (ROOT / "scripts").glob("*.js"):
        text = path.read_text(encoding="utf-8")
        for reference in re.findall(r"['\"](assets/images/[^'\"]+)['\"]", text):
            check_reference(reference, ROOT)
    print("All HTML, CSS, and JavaScript local asset references exist.")


if __name__ == "__main__":
    check_assets()
