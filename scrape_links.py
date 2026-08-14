import requests
from bs4 import BeautifulSoup
import json
import time
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

urls = [
    "https://jakarta.telkomuniversity.ac.id/en/",
    "https://jakarta.telkomuniversity.ac.id/alamat-dan-peta-kampus/",
    "https://smb.telkomuniversity.ac.id/jakarta/",
    "https://dti-jkt.telkomuniversity.ac.id/",
    "https://www.instagram.com/telkomuniversity_jkt/",
    "https://telkomuniversity.ac.id/en/telkom-university-kampus-jakarta/",
    "https://telkomuniversity.ac.id/en/",
    "https://igracias.telkomuniversity.ac.id/",
    "https://satu.telkomuniversity.ac.id/",
    "https://lms.telkomuniversity.ac.id/",
    "https://openlibrary.telkomuniversity.ac.id/",
    "https://servicedesk.telkomuniversity.ac.id/",
    "https://baa.telkomuniversity.ac.id/kalender-akademik-2-2/",
    "https://studentaffairs.telkomuniversity.ac.id/",
    "https://seeds.telkomuniversity.ac.id/"
]

results = []
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for idx, url in enumerate(urls):
    print(f"Scraping {url}...")
    try:
        r = requests.get(url, headers=headers, timeout=10, verify=False)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Title
        title_tag = soup.find('title')
        title = title_tag.text.strip() if title_tag else "Telkom University"
        
        # Description
        desc_tag = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
        desc = desc_tag['content'].strip() if desc_tag and desc_tag.has_attr('content') else "Telkom University Services"
        
        # Image
        img_tag = soup.find('meta', attrs={'property': 'og:image'})
        image = img_tag['content'].strip() if img_tag and img_tag.has_attr('content') else ""
        
        # fallback for instagram
        if "instagram.com" in url:
            title = "Instagram Telkom University Jakarta"
            desc = "Official Instagram of Telkom University Jakarta"
            
        results.append({
            "id": idx + 1,
            "title": title[:40] + "..." if len(title) > 40 else title,
            "subtitle": desc[:80] + "..." if len(desc) > 80 else desc,
            "url": url,
            "image": image
        })
    except Exception as e:
        print(f"Failed {url}: {e}")
        results.append({
            "id": idx + 1,
            "title": "Telkom University",
            "subtitle": "Telkom University Services",
            "url": url,
            "image": ""
        })
    time.sleep(1)

with open("scraped_links.json", "w") as f:
    json.dump(results, f, indent=2)

print("Done! Saved to scraped_links.json")
