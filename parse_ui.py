import re
import json

try:
    with open('temp.js', encoding='utf-8') as f:
        js = f.read()

    # Try to find object definitions containing "Extract Audio"
    # Look for React.createElement or JSX equivalents
    print("Found 'Extract Audio' in the following strings:")
    for m in set(re.findall(r'"([^"]*Extract Audio[^"]*)"', js)):
        print(m)

    print("\nExtracting nearby React structure:")
    matches = list(re.finditer(r'Extract Audio', js))
    for m in matches[:5]:
        start = max(0, m.start() - 500)
        end = min(len(js), m.end() + 500)
        print(f"\n--- Context near index {m.start()} ---")
        print(js[start:end])

except Exception as e:
    print(e)
