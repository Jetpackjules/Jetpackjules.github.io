import re, urllib.request

with open('public/assets/projects/rainy-day/webstore.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Video
videos = re.findall(r'https://[^\"\'\s>]+\.(?:mp4|webm)', html)
if videos:
    video_url = list(set(videos))[0]
    print('Downloading video:', video_url)
    urllib.request.urlretrieve(video_url, 'public/assets/projects/rainy-day/trailer.mp4')

# Images
lh3 = list(set(re.findall(r'https://lh3\.googleusercontent\.com/[a-zA-Z0-9_\-]+', html)))
print('Found', len(lh3), 'images.')
for i, img_url in enumerate(lh3[:4]):
    high_res_url = img_url + '=s2560'
    print('Downloading image:', high_res_url)
    try:
        urllib.request.urlretrieve(high_res_url, f'public/assets/projects/rainy-day/screen_{i}.png')
    except Exception as e:
        print('Error:', e)
