import base64
import io
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image
import server

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(server.app, base_url="http://127.0.0.1:8000")
        server.jobs.clear()

    def png(self):
        data = io.BytesIO()
        Image.new("RGB", (32, 64), "white").save(data, format="PNG")
        return data.getvalue()

    def test_health_and_private_files(self):
        self.assertEqual(self.client.get("/api/health").json()["provider"], "qwen-local")
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/supabase/functions/outfit-image/index.ts").status_code, 404)
        self.assertEqual(self.client.get("/.qwen-cache/model.safetensors").status_code, 404)

    def test_foreign_origin_cannot_run_gpu_work(self):
        response = self.client.post("/api/outfit-image", headers={"Origin": "https://example.com"})
        self.assertEqual(response.status_code, 403)
        response = self.client.get("/api/health", headers={"Host": "evil.example:8000"})
        self.assertEqual(response.status_code, 403)

    def test_public_origin_and_cors(self):
        with patch("server.allowed_origins", return_value={"https://copkill44-lgtm.github.io"}):
            response = self.client.post("/api/outfit-image", headers={"Origin": "https://copkill44-lgtm.github.io"})
            self.assertEqual(response.status_code, 422)
            self.assertEqual(response.headers["access-control-allow-origin"], "https://copkill44-lgtm.github.io")
        response = self.client.options("/api/outfit-image", headers={
            "Origin": "https://copkill44-lgtm.github.io", "Access-Control-Request-Method": "POST"})
        self.assertEqual(response.status_code, 200)

    def test_invalid_character_is_rejected(self):
        response = self.client.post("/api/outfit-image", headers={"Origin": "http://127.0.0.1:8000"},
                                    files={"image": ("character.png", b"invalid", "image/png")}, data={"outfit": "{}"})
        self.assertEqual(response.status_code, 400)

    def test_submission_polling_and_busy_handling(self):
        with patch("server.threading.Thread"):
            response = self.client.post("/api/outfit-image", headers={"Origin": "http://127.0.0.1:8000"},
                                        files={"image": ("character.png", self.png(), "image/png")}, data={"outfit": '{"top":"shirt"}'})
        try:
            self.assertEqual(response.status_code, 200)
            job_id = response.json()["jobId"]
            self.assertEqual(self.client.get("/api/outfit-image/" + job_id).json()["status"], "running")
            response = self.client.post("/api/outfit-image", headers={"Origin": "http://127.0.0.1:8000"},
                                        files={"image": ("character.png", self.png(), "image/png")}, data={"outfit": "{}"})
            self.assertEqual(response.status_code, 409)
        finally:
            server.job_lock.release()

    def test_cancellation_releases_lock_without_loading_model(self):
        for job_id, data in [("cancel-me", {"status": "running"}),
                             ("expired", {"status": "running", "last_seen": server.time.monotonic() - 61})]:
            server.jobs[job_id] = data
            if job_id == "cancel-me":
                response = self.client.post("/api/outfit-image/cancel-me/cancel",
                                            headers={"Origin": "http://127.0.0.1:8000"})
                self.assertEqual(response.status_code, 200)
            server.job_lock.acquire()
            with patch("server.load_pipeline") as load:
                server.generate(job_id, Image.new("RGB", (32, 64)), {})
                load.assert_not_called()
            self.assertEqual(server.jobs[job_id]["status"], "cancelled")
            self.assertFalse(server.job_lock.locked())

    def test_image_result_serialization_without_downloading_model(self):
        class Output:
            images = [Image.new("RGB", (32, 64), "blue")]
        server.jobs["sample"] = {"status": "running"}
        server.job_lock.acquire()
        def fast_preview(**kwargs):
            self.assertEqual(kwargs["num_inference_steps"], 20)
            self.assertEqual((kwargs["width"], kwargs["height"]), (384, 768))
            return Output()
        with patch("server.load_pipeline", return_value=fast_preview):
            server.generate("sample", Image.new("RGB", (32, 64)), {"top": "shirt"})
        result = self.client.get("/api/outfit-image/sample").json()
        self.assertEqual(result["status"], "done")
        self.assertTrue(base64.b64decode(result["image"]).startswith(b"\x89PNG"))
        self.assertFalse(server.job_lock.locked())

if __name__ == "__main__":
    unittest.main()
