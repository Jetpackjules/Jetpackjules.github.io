import fitz
import os

pdf_path = "public/assets/projects/squash/CSE 455 Final Project.pdf"
out_dir = "public/assets/projects/squash"

doc = fitz.open(pdf_path)
text_content = []

for page_idx in range(len(doc)):
    page = doc[page_idx]
    text_content.append(page.get_text())
    
    image_list = page.get_images(full=True)
    for img_idx, img in enumerate(image_list):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        image_name = f"slide_{page_idx+1}_img_{img_idx+1}.{image_ext}"
        with open(os.path.join(out_dir, image_name), "wb") as f:
            f.write(image_bytes)

with open(os.path.join(out_dir, "content.txt"), "w", encoding="utf-8") as f:
    f.write("\n---===---\n".join(text_content))

print("Extraction complete.")
