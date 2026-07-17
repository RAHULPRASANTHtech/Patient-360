import importlib.metadata

print("🔍 Scanning virtual environment for corrupted metadata...")

for dist in importlib.metadata.distributions():
    try:
        # Force Python to read the exact file that is causing the OSError
        dist.read_text('top_level.txt')
    except OSError:
        package_name = dist.metadata.get('Name', dist.name)
        print(f"\n🚨 FOUND THE CORRUPTED PACKAGE: {package_name}")
        print(f"📍 Location: {dist._path}\n")

print("✅ Scan complete.")