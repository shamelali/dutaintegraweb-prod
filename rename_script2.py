#!/usr/bin/env python3
import re

def update_file(filepath, changes):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content
    for pattern, replacement in changes:
        content = re.sub(pattern, replacement, content)
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    return False

# Add DutaGuard and DutaSight to contact service options
# Find contactServiceSecurity and add after it
changes = [
    (r'(contactServiceSecurity: \{[^}]+\},)',
     r'\1\n  contactServiceDutaGuard: {\n    en: "DutaGuard — Security & Compliance",\n    bm: "DutaGuard — Keselamatan & Pematuhan",\n  },\n  contactServiceDutaSight: {\n    en: "DutaSight — Analytics & BI",\n    bm: "DutaSight — Analitik & BI",\n  },'),
]

update_file('/media/shamelali/Data/1-Projects/dutaintegraweb-main/web-new/src/i18n/translations.ts', changes)
print("Done")
