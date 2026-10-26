import requests
import json

# 1. Fetch active listings
res = requests.get("http://localhost:8000/api/listings")
print("Active Listings Count:", len(res.json()))

if res.json():
    target = res.json()[0]
    target_id = target["id"]
    print(f"Testing DELETE on active listing {target_id}...")

    del_res = requests.delete(f"http://localhost:8000/api/listings/{target_id}")
    print("Delete Status Code:", del_res.status_code)
    print("Delete Response:", del_res.json())

    # Verify deletion
    res_after = requests.get("http://localhost:8000/api/listings")
    print("Active Listings Count After Delete:", len(res_after.json()))
    matching = [l for l in res_after.json() if l["id"] == target_id]
    if not matching:
        print("🎉 VERIFIED! Listing deleted successfully!")
    else:
        print("WARNING: Listing still present!")
