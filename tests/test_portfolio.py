"""
test_portfolio.py -- Automatizované testy pro Flask backend a REST API
Používá Flask Test Client (není vyžadován běžící server na portu 5000).
"""

import unittest
import json
from app import app, load_portfolio_data


class PortfolioTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def test_json_data_integrity(self):
        """Ověří integritu a povinné klíče v portfolio_data.json."""
        data = load_portfolio_data()
        self.assertIn("author", data)
        self.assertIn("categories", data)
        self.assertIn("projects", data)
        self.assertGreater(len(data["projects"]), 0)

    def test_index_route(self):
        """Ověří dostupnost hlavní stránky (GET /) a přítomnost jména autora."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Jakub", response.data)
        self.assertIn(b"ValuationPro", response.data)

    def test_api_metrics(self):
        """Ověří statistiky v GET /api/metrics."""
        response = self.client.get("/api/metrics")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "operational")
        self.assertGreater(data.get("total_projects", 0), 0)
        self.assertGreater(data.get("categories", 0), 0)

    def test_api_projects_all(self):
        """Ověří GET /api/projects."""
        response = self.client.get("/api/projects")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("projects", data)
        self.assertIn("count", data)
        self.assertEqual(data["count"], len(data["projects"]))

    def test_api_projects_filtered_by_category(self):
        """Ověří filtr podle kategorie v GET /api/projects?category=ai-data."""
        response = self.client.get("/api/projects?category=ai-data")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        for p in data["projects"]:
            self.assertEqual(p.get("category"), "ai-data")

    def test_api_projects_featured_only(self):
        """Ověří filtr podle featured v GET /api/projects?featured=true."""
        response = self.client.get("/api/projects?featured=true")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        for p in data["projects"]:
            self.assertTrue(p.get("featured", False))

    def test_api_project_detail_existing(self):
        """Ověří detail existujícího projektu GET /api/projects/valuation-pro."""
        response = self.client.get("/api/projects/valuation-pro")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("id"), "valuation-pro")

    def test_api_project_detail_not_found(self):
        """Ověří 404 pro neexistující projekt."""
        response = self.client.get("/api/projects/non-existent-xyz")
        self.assertEqual(response.status_code, 404)

    def test_api_data_complete(self):
        """Ověří kompletní export GET /api/data."""
        response = self.client.get("/api/data")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("author", data)
        self.assertIn("projects", data)

    def test_api_contact_validation_failure(self):
        """Ověří selhání validace při neúplných datech v POST /api/contact."""
        response = self.client.post(
            "/api/contact",
            data=json.dumps({"name": "Tester", "email": ""}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_api_contact_success(self):
        """Ověří úspěšné zpracování zprávy v POST /api/contact."""
        response = self.client.post(
            "/api/contact",
            data=json.dumps({
                "name": "Karel Novák",
                "email": "karel@example.com",
                "message": "Ahoj, poptávám vývoj scraperu."
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))


if __name__ == "__main__":
    unittest.main()
