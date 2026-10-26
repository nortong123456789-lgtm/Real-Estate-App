import requests

BOT_TOKEN = "8224116280:AAEN7GFksFsFXOHwLTmSuMMN3q-ChTaJdkQ"
FILE_ID = "AgACAgUAAxUHas9V25kszItv3rL4gJP87YHKZEsAAxNrG6yCgVaKzj07W6bHHQEAAwIAA20AAz0E"

url = f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={FILE_ID}"
res = requests.get(url)
print("official getFile status:", res.status_code)
print("official getFile JSON:", res.json())

if res.ok and res.json().get("ok"):
    file_path = res.json().get("result", {}).get("file_path")
    dl_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
    print("Testing direct Telegram CDN URL:", dl_url)
    img_res = requests.get(dl_url)
    print("Direct Download Status:", img_res.status_code)
    print("Direct Content Length:", len(img_res.content))
