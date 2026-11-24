import io
import json
import unittest
from unittest.mock import patch

import main


class AssetFetchTests(unittest.TestCase):
    def test_reports_normalized_javascript_content_type(self):
        response = io.BytesIO(b"console.log('ok')")
        response.status = 200
        response.headers = {"Content-Type": "text/javascript; charset=utf-8"}

        with patch.object(main.urllib.request, "urlopen", return_value=response):
            status, content_type, body, elapsed = main.fetch_asset("/assets/index-test.js")

        self.assertEqual(status, 200)
        self.assertEqual(content_type, "text/javascript")
        self.assertEqual(body, "console.log('ok')")
        self.assertGreaterEqual(elapsed, 0)


class ProductCatalogCheckTests(unittest.TestCase):
    def test_accepts_renderable_metrics_and_fetches_the_page_bundle(self):
        requests = []

        def fake_fetch(path, method="GET"):
            requests.append(path)
            if path == "/products":
                return 200, '<script type="module" src="/assets/index-test.js"></script>', 0.01
            if path == "/api/products":
                payload = {
                    "products": [
                        {
                            "name": "Leish",
                            "metrics": [
                                "99.99% uptime",
                                {"label": "Fewer enquiries", "value": "70%"},
                            ],
                        },
                        {"name": "No metrics yet", "metrics": []},
                    ]
                }
                return 200, json.dumps(payload), 0.01
            raise AssertionError(f"unexpected request: {path}")

        with patch.object(
            main,
            "fetch_asset",
            return_value=(200, "text/javascript", "console.log('ok')", 0.01),
        ) as asset_fetch, patch.object(main, "fetch", side_effect=fake_fetch):
            self.assertEqual(main.check_product_catalog(), [])

        asset_fetch.assert_called_once_with("/assets/index-test.js")
        self.assertEqual(requests, ["/products", "/api/products"])

    def test_rejects_malformed_metric_shapes(self):
        payload = {
            "products": [
                {"name": "Broken", "metrics": [{"label": "Only a label"}, 7, ""]},
                {"name": "Also broken", "metrics": {"label": "Not an array"}},
            ]
        }

        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 200, '<script src="/assets/index-test.js"></script>', 0.01
            if path == "/api/products":
                return 200, json.dumps(payload), 0.01
            raise AssertionError(f"unexpected request: {path}")

        with (
            patch.object(main, "fetch", side_effect=fake_fetch),
            patch.object(
                main,
                "fetch_asset",
                return_value=(200, "text/javascript", "console.log('ok')", 0.01),
            ),
        ):
            failures = main.check_product_catalog()

        self.assertEqual(
            failures,
            [
                "/api/products product 0 metric 0 is not renderable",
                "/api/products product 0 metric 1 is not renderable",
                "/api/products product 0 metric 2 is not renderable",
                "/api/products product 1 metrics is not an array",
            ],
        )

    def test_rejects_invalid_product_collection_shapes(self):
        cases = [
            (None, ["/api/products returned no products array"]),
            ({}, ["/api/products returned no products array"]),
            ({"products": {}}, ["/api/products returned no products array"]),
            (
                {"products": [None]},
                ["/api/products product 0 is not an object"],
            ),
            (
                {"products": [{"name": "Missing metrics"}]},
                ["/api/products product 0 metrics is not an array"],
            ),
            (
                {
                    "products": [
                        {
                            "metrics": [
                                {"label": "   ", "value": "70%"},
                                {"label": "Support", "value": " "},
                                {"label": 123, "value": "24/7"},
                                {"label": "Support", "value": 24},
                            ]
                        }
                    ]
                },
                [
                    "/api/products product 0 metric 0 is not renderable",
                    "/api/products product 0 metric 1 is not renderable",
                    "/api/products product 0 metric 2 is not renderable",
                    "/api/products product 0 metric 3 is not renderable",
                ],
            ),
        ]

        for payload, expected in cases:
            with self.subTest(payload=payload):
                def fake_fetch(path, method="GET"):
                    if path == "/products":
                        return 200, '<script src="/assets/index-test.js"></script>', 0.01
                    if path == "/api/products":
                        return 200, json.dumps(payload), 0.01
                    raise AssertionError(f"unexpected request: {path}")

                with (
                    patch.object(main, "fetch", side_effect=fake_fetch),
                    patch.object(
                        main,
                        "fetch_asset",
                        return_value=(200, "text/javascript", "console.log('ok')", 0.01),
                    ),
                ):
                    self.assertEqual(main.check_product_catalog(), expected)

    def test_rejects_a_products_page_without_a_bundle(self):
        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 200, "<main>Products</main>", 0.01
            if path == "/api/products":
                return 200, json.dumps({"products": []}), 0.01
            raise AssertionError(f"unexpected request: {path}")

        with patch.object(main, "fetch", side_effect=fake_fetch):
            failures = main.check_product_catalog()

        self.assertEqual(
            failures,
            ["/products references no /assets/index-*.js bundle"],
        )

    def test_rejects_html_returned_for_a_javascript_bundle(self):
        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 200, '<script src="/assets/index-test.js"></script>', 0.01
            if path == "/api/products":
                return 200, json.dumps({"products": []}), 0.01
            raise AssertionError(f"unexpected request: {path}")

        with (
            patch.object(main, "fetch", side_effect=fake_fetch),
            patch.object(
                main,
                "fetch_asset",
                return_value=(200, "text/html", "<!doctype html><title>Fallback</title>", 0.01),
            ),
        ):
            failures = main.check_product_catalog()

        self.assertEqual(
            failures,
            ["asset /assets/index-test.js returned text/html instead of JavaScript"],
        )

    def test_rejects_empty_or_html_bundle_bodies_with_javascript_content_type(self):
        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 200, '<script src="/assets/index-test.js"></script>', 0.01
            if path == "/api/products":
                return 200, json.dumps({"products": []}), 0.01
            raise AssertionError(f"unexpected request: {path}")

        for body in (
            "",
            "<!doctype html><title>Fallback</title>",
            "\ufeff<!doctype html><title>Fallback</title>",
            "<!-- fallback --><html><body>Fallback</body></html>",
            "<head><title>Fallback</title></head>",
            "<body>Fallback</body>",
        ):
            with self.subTest(body=body):
                with (
                    patch.object(main, "fetch", side_effect=fake_fetch),
                    patch.object(
                        main,
                        "fetch_asset",
                        return_value=(200, "text/javascript", body, 0.01),
                    ),
                ):
                    failures = main.check_product_catalog()

                self.assertEqual(
                    failures,
                    ["asset /assets/index-test.js returned empty or HTML content"],
                )

    def test_rejects_an_unavailable_bundle(self):
        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 200, '<script src="/assets/index-test.js"></script>', 0.01
            if path == "/api/products":
                return 200, json.dumps({"products": []}), 0.01
            raise AssertionError(f"unexpected request: {path}")

        with (
            patch.object(main, "fetch", side_effect=fake_fetch),
            patch.object(main, "fetch_asset", return_value=(404, "text/html", "not found", 0.01)),
        ):
            failures = main.check_product_catalog()

        self.assertEqual(failures, ["asset /assets/index-test.js returned 404"])

    def test_rejects_unavailable_endpoints(self):
        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 503, "unavailable", 0.01
            if path == "/api/products":
                return 500, "unavailable", 0.01
            raise AssertionError(f"unexpected request: {path}")

        with patch.object(main, "fetch", side_effect=fake_fetch):
            failures = main.check_product_catalog()

        self.assertEqual(
            failures,
            [
                "/products returned 503 (expected 200)",
                "/api/products returned 500 (expected 200)",
            ],
        )

    def test_rejects_invalid_api_json(self):
        def fake_fetch(path, method="GET"):
            if path == "/products":
                return 200, '<script src="/assets/index-test.js"></script>', 0.01
            if path == "/api/products":
                return 200, "not json", 0.01
            raise AssertionError(f"unexpected request: {path}")

        with (
            patch.object(main, "fetch", side_effect=fake_fetch),
            patch.object(
                main,
                "fetch_asset",
                return_value=(200, "text/javascript", "console.log('ok')", 0.01),
            ),
        ):
            failures = main.check_product_catalog()

        self.assertEqual(failures, ["/api/products returned invalid JSON"])


if __name__ == "__main__":
    unittest.main()
