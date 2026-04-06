import zipfile
import os
import glob
import shutil

pptx_path = "public/assets/projects/squash/CSE 455 Final Project.pptx"
extract_dir = "public/assets/projects/squash/extracted_media"
os.makedirs(extract_dir, exist_ok=True)

try:
    with zipfile.ZipFile(pptx_path, 'r') as zip_ref:
        for file_info in zip_ref.infolist():
            if file_info.filename.startswith("ppt/media/") and file_info.filename.endswith(".gif"):
                zip_ref.extract(file_info, extract_dir)
                print(f"Extracted: {file_info.filename}")
                
    gif_files = glob.glob(os.path.join(extract_dir, "ppt/media/*.gif"))
    
    # We expect 2 gifs. We will replace the old ones. Wait, we don't know which is which.
    # We will just print them and their sizes.
    for i, g in enumerate(gif_files):
        size = os.path.getsize(g)
        print(f"Index {i}: {g} (Size: {size} bytes)")
        
except Exception as e:
    print(f"Error: {e}")
