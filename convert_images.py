import os
from PIL import Image

def convert_to_webp(filename):
    try:
        if not os.path.exists(filename):
            print(f"File not found: {filename}")
            return

        img = Image.open(filename)
        webp_filename = os.path.splitext(filename)[0] + ".webp"
        img.save(webp_filename, "WEBP")
        print(f"Converted {filename} to {webp_filename}")
    except Exception as e:
        print(f"Failed to convert {filename}: {e}")

if __name__ == "__main__":
    convert_to_webp("Pixel Magix.png")
    convert_to_webp("background.png")
