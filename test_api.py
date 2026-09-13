"""Testovaci skript pro overeni vsech API endpointu."""
import urllib.request
import json

BASE = "http://127.0.0.1:5000"

tests = [
    ("GET /", BASE + "/"),
    ("GET /api/metrics", BASE + "/api/metrics"),
    ("GET /api/projects", BASE + "/api/projects"),
    ("GET /api/projects?category=ai-data", BASE + "/api/projects?category=ai-data"),
    ("GET /api/projects?featured=true", BASE + "/api/projects?featured=true"),
    ("GET /api/projects/valuation-pro", BASE + "/api/projects/valuation-pro"),
    ("GET /api/data", BASE + "/api/data"),
]

all_ok = True
for name, url in tests:
    try:
        res = urllib.request.urlopen(url, timeout=5)
        code = res.getcode()
        body = res.read()
        if url.endswith("/"):
            # HTML - staci zkontrolovat, ze obsahuje titulku
            assert b"Jakub" in body, "HTML neobsahuje jmeno autora!"
            assert b"ValuationPro" in body, "HTML neobsahuje projekt ValuationPro!"
            print(f"[PASS] {name} -> {code} | HTML OK ({len(body)} bytes)")
        else:
            data = json.loads(body)
            print(f"[PASS] {name} -> {code} | JSON OK")
    except Exception as e:
        print(f"[FAIL] {name} -> {e}")
        all_ok = False

# Test POST /api/contact
import urllib.parse
payload = json.dumps({"name": "Test", "email": "test@test.cz", "message": "Testovaci zprava z CI."}).encode()
req = urllib.request.Request(BASE + "/api/contact", data=payload,
                              headers={"Content-Type": "application/json"}, method="POST")
try:
    res = urllib.request.urlopen(req, timeout=5)
    data = json.loads(res.read())
    assert data.get("success") is True, f"Contact API nevraci success: {data}"
    print(f"[PASS] POST /api/contact -> 200 | {data['message']}")
except Exception as e:
    print(f"[FAIL] POST /api/contact -> {e}")
    all_ok = False

print()
if all_ok:
    print("=== VSECHNY TESTY PROSLY (100%) ===")
else:
    print("=== NEKTERY TEST SELHAL ===")
    exit(1)
