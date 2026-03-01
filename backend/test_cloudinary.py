"""Quick Cloudinary upload test. Run: python test_cloudinary.py"""
import cloudinary
import cloudinary.uploader
import io
from dotenv import load_dotenv
import os

load_dotenv(".env")

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
api_key = os.getenv("CLOUDINARY_API_KEY", "")
api_secret = os.getenv("CLOUDINARY_API_SECRET", "")

print("=" * 55)
print("  Cloudinary Upload Test")
print("=" * 55)
print(f"  Cloud Name : {cloud_name}")
print(f"  API Key    : {api_key}")
print(f"  API Secret : {api_secret[:10]}..." if api_secret else "  API Secret : (empty)")
print("-" * 55)

if not all([cloud_name, api_key, api_secret]):
    print("[FAIL] Missing Cloudinary credentials in .env")
    exit(1)

cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret,
    secure=True,
)

# Create a tiny test ZIP file (a valid ZIP header)
import zipfile

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("test.txt", "Hello from DevMarket test!")
buf.seek(0)

print(f"  Test file size: {buf.getbuffer().nbytes} bytes")
print("-" * 55)

try:
    result = cloudinary.uploader.upload(
        buf,
        resource_type="raw",
        folder="devmarket/test",
        public_id="test_upload_check",
        overwrite=True,
    )
    print(f"[OK]   Upload succeeded!")
    print(f"  Public ID  : {result['public_id']}")
    print(f"  Secure URL : {result['secure_url']}")
    print(f"  Format     : {result.get('format', 'N/A')}")
    print(f"  Bytes      : {result.get('bytes', 'N/A')}")
    print("-" * 55)
    print("[PASS] Cloudinary is working correctly.")

    # Cleanup
    cloudinary.uploader.destroy(result['public_id'], resource_type="raw")
    print("[OK]   Test file cleaned up.")

except Exception as e:
    print(f"[FAIL] Upload error: {e}")
    print()
    print("Common fixes:")
    print("  1. Check CLOUDINARY_CLOUD_NAME in .env")
    print("  2. Check CLOUDINARY_API_KEY in .env")
    print("  3. Check CLOUDINARY_API_SECRET in .env")
    print("  4. Make sure the API key is Active in Cloudinary dashboard")
    exit(1)
