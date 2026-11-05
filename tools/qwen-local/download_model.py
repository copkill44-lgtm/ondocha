"""Resumable Qwen download with bounded connection retries."""
import json
import os
import time
from pathlib import Path

import truststore
truststore.inject_into_ssl()
ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("HF_HOME", str(ROOT / ".qwen-cache"))
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "30")
from huggingface_hub import snapshot_download
from requests.exceptions import RequestException

MODEL = "Qwen/Qwen-Image-Edit"
STATE_FILE = ROOT / ".qwen-cache" / "download-status.json"

def save_status(state, attempt, **extra):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps({"state": state, "attempt": attempt, "updated": time.time(), **extra}), encoding="utf-8")
    temporary.replace(STATE_FILE)

def prepare_model(report=None, attempts=30, sleep=time.sleep):
    for attempt in range(1, attempts + 1):
        save_status("downloading", attempt)
        if report:
            report(f"Qwen 모델 다운로드 중 · 연결 시도 {attempt} · 중단되면 자동으로 이어받아요.")
        try:
            path = snapshot_download(
                MODEL, max_workers=1, force_download=False,
                allow_patterns=["*.json", "*.txt", "*.model", "*.safetensors", "*.tiktoken"],
            )
        except (RequestException, OSError, TimeoutError) as error:
            # Access/configuration errors cannot be repaired by reconnecting.
            response = getattr(error, "response", None)
            status_code = getattr(response, "status_code", None)
            fatal = status_code in {400, 401, 403, 404} or isinstance(error, (PermissionError, FileNotFoundError)) or getattr(error, "errno", None) == 28
            if fatal or attempt == attempts:
                save_status("error", attempt, error=str(error)[:300])
                raise
            delay = min(30, attempt * 3)
            save_status("retrying", attempt, retry_seconds=delay, error=str(error)[:300])
            if report:
                report(f"연결이 끊겨 {delay}초 후 자동으로 이어받아요. 받은 데이터는 유지됩니다.")
            sleep(delay)
            continue
        save_status("complete", attempt, path=path)
        if report:
            report("모델 다운로드 완료 · GPU에 모델을 준비하고 있어요.")
        return path

if __name__ == "__main__":
    print(prepare_model(report=lambda message: print(message, flush=True)), flush=True)
