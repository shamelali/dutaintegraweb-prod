#!/usr/bin/env python3
import re

def update_file(filepath, changes):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content
    for pattern, replacement in changes:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True
    return False

# Update home.tsx LANDING_COPY - services and products arrays
changes = [
    # Update services array in EN
    (r'(services: \[\s*\n\s*\[)"Managed IT"(.*?)\n\s*\]\s*,\s*\n\s*\["IT Security"(.*?)\n\s*\]\s*,\s*\n\s*\["Cloud Migration"(.*?)\n\s*\]\s*,\s*\n\s*\["AI Development"(.*?)\n\s*\]\s*\])',
     r'\1"Managed IT"\2\n\s*\]\s*,\s*\n\s*\["IT Security & Compliance"\3\n\s*\]\s*,\s*\n\s*\["Cloud Migration"\4\n\s*\]\s*,\s*\n\s*\["AI Development"\5\n\s*\]\s*\]'),
    
    # Update services array in BM
    (r'(services: \[\s*\n\s*\[)"IT Terurus"(.*?)\n\s*\]\s*,\s*\n\s*\["Keselamatan IT"(.*?)\n\s*\]\s*,\s*\n\s*\["Migrasi Awan"(.*?)\n\s*\]\s*,\s*\n\s*\["Pembangunan AI"(.*?)\n\s*\]\s*\])',
     r'\1"IT Terurus"\2\n\s*\]\s*,\s*\n\s*\["Keselamatan IT & Pematuhan"\3\n\s*\]\s*,\s*\n\s*\["Migrasi Awan"\4\n\s*\]\s*,\s*\n\s*\["Pembangunan AI"\5\n\s*\]\s*\]'),
    
    # Update products array in EN - add DutaGuard and DutaSight
    (r'(products: \[\s*\n\s*\["Autonomous Ops"(.*?)\n\s*\]\s*,\s*\n\s*\["DutaConnect"(.*?)\n\s*\]\s*\])',
     r'\1"Autonomous Ops"\2\n\s*\]\s*,\s*\n\s*\["DutaConnect"\3\n\s*\]\s*,\s*\n\s*\["DutaGuard", "Security, compliance, and threat monitoring for Malaysian SMEs"\.]\s*,\s*\n\s*\["DutaSight", "Business intelligence, KPI dashboards, and AI-powered analytics"\.]\s*\]'),
    
    # Update products array in BM - add DutaGuard and DutaSight
    (r'(products: \[\s*\n\s*\["Autonomous Ops"(.*?)\n\s*\]\s*,\s*\n\s*\["DutaConnect"(.*?)\n\s*\]\s*\])',
     r'\1"Autonomous Ops"\2\n\s*\]\s*,\s*\n\s*\["DutaConnect"\3\n\s*\]\s*,\s*\n\s*\["DutaGuard", "Keselamatan, pematuhan, dan pemantauan ancaman untuk PKS Malaysia"\.]\s*,\s*\n\s*\["DutaSight", "Kecerdasan perniagaan, papan pemuka KPI, dan analitik bertenaga AI"\.]\s*\]'),
]

update_file('/media/shamelali/Data/1-Projects/dutaintegraweb-main/web-new/src/pages/home.tsx', changes)
print("Done")
