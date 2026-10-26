import requests
import json

DRAFT_ID = "1176ac57-624e-4710-b6c8-7d7004139cec"
URL = f"http://localhost:8000/api/listings/{DRAFT_ID}"

payload = {
    "configuration": "2 BHK Luxury",
    "rent_amount": 35000,
    "neighborhood": "Koramangala 5th Block",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "status": "active"
}

print(f"Publishing Draft {DRAFT_ID} to Active Map Listing...")
res = requests.patch(URL, json=payload)
print("HTTP Status Code:", res.status_code)

if res.ok:
    print("🎉 SUCCESS! Published Listing Data:")
    print(json.dumps(res.json(), indent=2))
else:
    print("Failed to publish:", res.text)
