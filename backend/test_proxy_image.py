import requests

FILE_ID = "AgACAgUAAxUHas9V25kszItv3rL4gJP87YHKZEsAAxNrG6yCgVaKzj07W6bHHQEAAwIAA20AAz0E"
URL = f"http://47.129.153.29/api/listings/media/{FILE_ID}"

print(f"Testing image proxy URL: {URL}")
res = requests.get(URL)
print("HTTP Status Code:", res.status_code)
print("Content Type:", res.headers.get("Content-Type"))
print("Image Bytes Length:", len(res.content))

if res.status_code == 200 and len(res.content) > 0:
    print("🎉 SUCCESS! Image retrieved from Telegram CDN and proxied live!")
else:
    print("Failed to retrieve image:", res.text)
