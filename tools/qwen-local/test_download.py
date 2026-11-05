import unittest
from unittest.mock import patch, Mock
import requests
import download_model

class DownloadTests(unittest.TestCase):
    def test_disconnect_resumes_without_forcing_redownload(self):
        with patch.object(download_model, "snapshot_download", side_effect=[requests.exceptions.ChunkedEncodingError("interrupted"), "cached-model"]) as fetch, patch.object(download_model, "save_status") as status:
            pause = Mock()
            self.assertEqual(download_model.prepare_model(attempts=3, sleep=pause), "cached-model")
            self.assertEqual(fetch.call_count, 2)
            self.assertEqual(fetch.call_args.kwargs["max_workers"], 1)
            self.assertFalse(fetch.call_args.kwargs["force_download"])
            pause.assert_called_once_with(3)
            self.assertEqual(status.call_args.args[0], "complete")

    def test_permission_error_is_not_retried(self):
        error = requests.HTTPError("forbidden", response=Mock(status_code=403))
        with patch.object(download_model, "snapshot_download", side_effect=error) as fetch, patch.object(download_model, "save_status"):
            with self.assertRaises(requests.HTTPError):
                download_model.prepare_model(attempts=3, sleep=Mock())
            self.assertEqual(fetch.call_count, 1)

    def test_repeated_connection_failure_stops_with_error(self):
        with patch.object(download_model, "snapshot_download", side_effect=requests.ConnectionError("offline")) as fetch, patch.object(download_model, "save_status") as status:
            with self.assertRaises(requests.ConnectionError):
                download_model.prepare_model(attempts=2, sleep=Mock())
            self.assertEqual(fetch.call_count, 2)
            self.assertEqual(status.call_args.args[0], "error")
