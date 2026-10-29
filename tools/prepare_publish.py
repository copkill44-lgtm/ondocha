"""Copy the current website into publish-ready and refresh its ZIP archive."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "publish-ready"
ARCHIVE = ROOT / "website-publish-ready.zip"


def prepare_publish():
    sources = [ROOT / "index.html"]
    for folder in ("styles", "scripts", "assets/images"):
        sources.extend(path for path in (ROOT / folder).rglob("*") if path.is_file())

    expected = {path.relative_to(ROOT) for path in sources}
    OUTPUT.mkdir(exist_ok=True)

    # Only generated output is cleaned. Reject links that could lead outside it.
    for path in OUTPUT.rglob("*"):
        if path.is_symlink() or not path.resolve().is_relative_to(OUTPUT.resolve()):
            raise RuntimeError("Unexpected link in publish-ready: " + str(path))
    for path in OUTPUT.rglob("*"):
        if path.is_file() and path.relative_to(OUTPUT) not in expected:
            path.unlink()
    for path in sorted(OUTPUT.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_dir() and not any(path.iterdir()):
            path.rmdir()

    for source in sources:
        destination = OUTPUT / source.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    shutil.make_archive(str(ARCHIVE.with_suffix("")), "zip", OUTPUT)
    print("Prepared publish-ready and website-publish-ready.zip (%d files)." % len(sources))


if __name__ == "__main__":
    prepare_publish()
