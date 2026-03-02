import urllib.request
import json
import urllib.error
import sys

try:
    sys.path.append('c:/Users/anmol/Documents/NEW-001/backend')
    from app.config import settings
    print("RESEND_API_KEY:", settings.RESEND_API_KEY)
except Exception as e:
    print("CONFIG LOAD ERROR:", e)

try:
    data = {
        "from": "onboarding@resend.dev",
        "to": ["sihk350@gmail.com"],
        "subject": "Test",
        "html": "test"
    }
    req = urllib.request.Request("https://api.resend.com/emails", data=json.dumps(data).encode("utf-8"))
    req.add_header("Authorization", f"Bearer {settings.RESEND_API_KEY}")
    req.add_header("Content-Type", "application/json")
    response = urllib.request.urlopen(req)
    print("SUCCESS:", response.read())
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.read().decode())
except Exception as e:
    print("OTHER ERROR:", e)
