import urllib.request
import urllib.parse
import json

BOT_TOKEN = "8224116280:AAEN7GFksFsFXOHwLTmSuMMN3q-ChTaJdkQ"
CHAT_ID = "-5471118807"

def test_send_message():
    print(f"=== TESTING SEND MESSAGE TO CHAT {CHAT_ID} ===")
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": CHAT_ID,
        "text": "🎉 ApnaGhar RealEstate Engine Connected Successfully!"
    }).encode('utf-8')

    try:
        req = urllib.request.urlopen(url, data=data)
        res = json.loads(req.read().decode())
        print("SUCCESS sendMessage! Response:", res)
    except Exception as e:
        print(f"FAILED sendMessage: {e}")

if __name__ == "__main__":
    test_send_message()
