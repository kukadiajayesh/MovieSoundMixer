import re
import base64
import zlib

try:
    with open('temp.js', encoding='utf-8') as f:
        js = f.read()

    matches = re.finditer(r'"data":"([A-Za-z0-9+/=]+)"', js)
    for i, match in enumerate(matches):
        data = base64.b64decode(match.group(1))
        decompressed = zlib.decompress(data, 16 + zlib.MAX_WBITS)
        with open(f'decoded_{i}.js', 'wb') as out:
            out.write(decompressed)
        print(f"Decoded {i} length {len(decompressed)}")
except Exception as e:
    print(e)
