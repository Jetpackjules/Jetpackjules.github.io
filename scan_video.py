import re, urllib.request

with open('public/assets/projects/rainy-day/webstore.html', 'r', encoding='utf-8') as f:
    html = f.read()

lh3 = list(set(re.findall(r'https://lh3\.googleusercontent\.com/[a-zA-Z0-9_\-]+', html)))

print('Scanning', len(lh3), 'URLs for video MIME types...')
found_vid = False
for url in lh3:
    try:
        req = urllib.request.Request(url, method='HEAD')
        resp = urllib.request.urlopen(req, timeout=3)
        ctype = resp.headers.get('Content-Type')
        if ctype and 'video' in ctype.lower():
            print('FOUND VIDEO:', url)
            urllib.request.urlretrieve(url, 'public/assets/projects/rainy-day/trailer.mp4')
            found_vid = True
            break
    except:
        pass

if not found_vid:
    print('No video MIME types found natively. Google likely streams this chunked via XHR.')
