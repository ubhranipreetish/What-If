import urllib.request
import json

def test_api(url):
    try:
        with urllib.request.urlopen(url) as response:
            data = response.read().decode('utf-8')
            return json.loads(data)
    except Exception as e:
        return f"Error: {e}"

print("Testing Metadata API...")
print(test_api("http://127.0.0.1:8000/api/metadata/match/2019_60"))

print("\nTesting Balls API...")
print(test_api("http://127.0.0.1:8000/api/match/2019_60/balls"))
