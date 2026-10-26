import urllib.request
import json

BOT_TOKEN = "8224116280:AAEN7GFksFsFXOHwLTmSuMMN3q-ChTaJdkQ"
CHAT_IDS = ["-1005471118807", "-5471118807", "5471118807", "@ApnaGharListings"]

def test_telegram():
    print("=== TESTING TELEGRAM BOT API ===")

    # 1. Test getMe
    url_getme = f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
    try:
        req = urllib.request.urlopen(url_getme)
        res = json.loads(req.read().decode())
        print(f"SUCCESS getMe: Bot Username = @{res.get('result', {}).get('username')}")
    except Exception as e:
        print(f"FAILED getMe: {e}")
        return

    # 2. Test getChat for candidate chat IDs
    for cid in CHAT_IDS:
        url_getchat = f"https://api.telegram.org/bot{BOT_TOKEN}/getChat?chat_id={cid}"
        try:
            req = urllib.request.urlopen(url_getchat)
            res = json.loads(req.read().decode())
            print(f"SUCCESS getChat for {cid}: Title = '{res.get('result', {}).get('title')}'")
        except Exception as e:
            print(f"FAILED getChat for {cid}: {e}")

if __name__ == "__main__":
    test_telegram()
