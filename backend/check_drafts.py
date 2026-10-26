import requests
import json

res = requests.get("http://47.129.153.29/api/listings/drafts")
print("Status Code:", res.status_code)
print("Drafts Output:")
print(json.dumps(res.json(), indent=2))
