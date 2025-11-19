import os

def verify_changes():
    files_to_check = ["Pixel Magix.webp", "background.webp"]
    all_exist = True
    for f in files_to_check:
        if os.path.exists(f) and os.path.getsize(f) > 0:
            print(f"[PASS] {f} exists and is not empty.")
        else:
            print(f"[FAIL] {f} missing or empty.")
            all_exist = False

    # Check code updates
    with open("index.html", "r", encoding="utf-8") as f:
        content = f.read()
        if "background.webp" in content:
            print("[PASS] index.html updated.")
        else:
            print("[FAIL] index.html not updated.")

    with open("style.css", "r", encoding="utf-8") as f:
        content = f.read()
        if "background.webp" in content:
            print("[PASS] style.css updated.")
        else:
            print("[FAIL] style.css not updated.")

if __name__ == "__main__":
    verify_changes()
