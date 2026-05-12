from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

try:
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)

    driver.get('file:///L:/Downloads/Audio Manager/FFmpeg Audio Manager _Standalone_.html')
    time.sleep(2) # wait for React to mount

    html = driver.page_source
    with open('L:/Downloads/Audio Manager/rendered_ui.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print("Successfully rendered and saved to rendered_ui.html")
    driver.quit()
except Exception as e:
    print(f"Error: {e}")
