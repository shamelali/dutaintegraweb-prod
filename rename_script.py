#!/usr/bin/env python3
"""
Script to rename service/product names across the codebase:
- Sensai → DutaSense
- Ontrac → DutaTrack
- Flowmail → DutaFlow
- Add DutaGuard (security) and DutaSight (analytics) products
- Keep: DutaConnect (standalone pilot), DutaOS modules (Connect, Ops, Govern, Bundle)
"""

import re
import os

def update_file(filepath, changes):
    """Apply multiple regex changes to a file"""
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

# ============================================================
# TRANSLATIONS.TS CHANGES
# ============================================================
translations_changes = [
    # Add new footer entries for DutaGuard and DutaSight after idxFooterItSec
    (r'(idxFooterItSec: \{[^}]+\},)', 
     r'\1\n  idxFooterDutaGuard: {\n    en: "DutaGuard",\n    bm: "DutaGuard",\n  },\n  idxFooterDutaSight: {\n    en: "DutaSight",\n    bm: "DutaSight",\n  },'),
]

update_file('/media/shamelali/Data/1-Projects/dutaintegraweb-main/web-new/src/i18n/translations.ts', translations_changes)

print("Done with translations.ts")
