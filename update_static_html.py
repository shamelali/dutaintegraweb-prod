import re

def update_duta_track():
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/duta-track.html', 'r') as f:
        content = f.read()
    
    # Fix nav link - remove self-reference, add dropdown or just remove the product link
    # The pattern is: <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
    old_nav = '''<li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>'''
    new_nav = '''<li><a href="duta-sense.html" style="color:var(--electric)" data-i18n="navDutaSense">DutaSense</a></li>
            <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
            <li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>
            <li><a href="duta-guard.html" style="color:var(--electric)" data-i18n="navDutaGuard">DutaGuard</a></li>
            <li><a href="duta-sight.html" style="color:var(--electric)" data-i18n="navDutaSight">DutaSight</a></li>'''
    content = content.replace(old_nav, new_nav)
    
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/duta-track.html', 'w') as f:
        f.write(content)
    print("Updated duta-track.html")

def update_duta_flow():
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/duta-flow.html', 'r') as f:
        content = f.read()
    
    # Fix nav link
    old_nav = '''<li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>'''
    new_nav = '''<li><a href="duta-sense.html" style="color:var(--electric)" data-i18n="navDutaSense">DutaSense</a></li>
            <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
            <li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>
            <li><a href="duta-guard.html" style="color:var(--electric)" data-i18n="navDutaGuard">DutaGuard</a></li>
            <li><a href="duta-sight.html" style="color:var(--electric)" data-i18n="navDutaSight">DutaSight</a></li>'''
    content = content.replace(old_nav, new_nav)
    
    # Update API endpoints from /api/ops/ to /api/flow/
    content = content.replace('/api/ops/consent', '/api/flow/consent')
    content = content.replace('/api/ops/feed', '/api/flow/feed')
    
    # Update localStorage key
    content = content.replace('ops_feed_consent', 'flow_feed_consent')
    content = content.replace('ops_feed_email', 'flow_feed_email')
    
    # Update consent text
    content = content.replace(
        'I consent to viewing aggregated infrastructure monitoring data as described above.',
        'I consent to viewing aggregated email automation data as described above.'
    )
    
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/duta-flow.html', 'w') as f:
        f.write(content)
    print("Updated duta-flow.html")

def update_praxis():
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/praxis.html', 'r') as f:
        content = f.read()
    
    # Fix nav link - replace autonomous-ops.html with duta-track.html (or product dropdown)
    old_nav = '''<li><a href="autonomous-ops.html" style="color:var(--electric)" data-i18n="navAutonomousOps">Autonomous Ops</a></li>'''
    new_nav = '''<li><a href="duta-sense.html" style="color:var(--electric)" data-i18n="navDutaSense">DutaSense</a></li>
            <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
            <li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>
            <li><a href="duta-guard.html" style="color:var(--electric)" data-i18n="navDutaGuard">DutaGuard</a></li>
            <li><a href="duta-sight.html" style="color:var(--electric)" data-i18n="navDutaSight">DutaSight</a></li>'''
    content = content.replace(old_nav, new_nav)
    
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/praxis.html', 'w') as f:
        f.write(content)
    print("Updated praxis.html")

def update_integrall():
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/integrall.html', 'r') as f:
        content = f.read()
    
    # Fix nav link - remove self-reference
    old_nav = '''<li><a href="integrall.html" style="color:var(--electric)" data-i18n="navIntegrall">Integrall</a></li>'''
    new_nav = '''<li><a href="duta-sense.html" style="color:var(--electric)" data-i18n="navDutaSense">DutaSense</a></li>
            <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
            <li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>
            <li><a href="duta-guard.html" style="color:var(--electric)" data-i18n="navDutaGuard">DutaGuard</a></li>
            <li><a href="duta-sight.html" style="color:var(--electric)" data-i18n="navDutaSight">DutaSight</a></li>'''
    content = content.replace(old_nav, new_nav)
    
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/integrall.html', 'w') as f:
        f.write(content)
    print("Updated integrall.html")

def update_autonomous_ops():
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/autonomous-ops.html', 'r') as f:
        content = f.read()
    
    # Fix nav link - remove self-reference
    old_nav = '''<li><a href="autonomous-ops.html" style="color:var(--electric)" data-i18n="navAutonomousOps">Autonomous Ops</a></li>'''
    new_nav = '''<li><a href="duta-sense.html" style="color:var(--electric)" data-i18n="navDutaSense">DutaSense</a></li>
            <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
            <li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>
            <li><a href="duta-guard.html" style="color:var(--electric)" data-i18n="navDutaGuard">DutaGuard</a></li>
            <li><a href="duta-sight.html" style="color:var(--electric)" data-i18n="navDutaSight">DutaSight</a></li>'''
    content = content.replace(old_nav, new_nav)
    
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/autonomous-ops.html', 'w') as f:
        f.write(content)
    print("Updated autonomous-ops.html")

def update_legal_pages():
    # Common old product nav block to replace
    old_product_nav = '''    <li><a href="autonomous-ops.html" style="color:var(--electric)" data-i18n="navAutonomousOps">Autonomous Ops</a></li>
    <li><a href="flowmail.html">Flowmail</a></li>
    <li><a href="praxis.html">Praxis</a></li>
    <li><a href="ontrac.html">Ontrac</a></li>
    <li><a href="sensai.html">Sensai</a></li>
    <li><a href="integrall.html">Integrall</a></li>
    <li><a href="dutaconnect.html">DutaConnect</a></li>'''
    
    new_product_nav = '''    <li><a href="duta-sense.html" style="color:var(--electric)" data-i18n="navDutaSense">DutaSense</a></li>
    <li><a href="duta-track.html" style="color:var(--electric)" data-i18n="navDutaTrack">DutaTrack</a></li>
    <li><a href="duta-flow.html" style="color:var(--electric)" data-i18n="navDutaFlow">DutaFlow</a></li>
    <li><a href="duta-guard.html" style="color:var(--electric)" data-i18n="navDutaGuard">DutaGuard</a></li>
    <li><a href="duta-sight.html" style="color:var(--electric)" data-i18n="navDutaSight">DutaSight</a></li>
    <li><a href="dutaconnect.html">DutaConnect</a></li>'''
    
    for filename in ['tos.html', 'sla.html', 'cases.html', 'privacy.html']:
        with open(f'/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/{filename}', 'r') as f:
            content = f.read()
        content = content.replace(old_product_nav, new_product_nav)
        with open(f'/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/{filename}', 'w') as f:
            f.write(content)
        print(f"Updated {filename}")
    
    # pdpa.html has slightly different formatting
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/pdpa.html', 'r') as f:
        content = f.read()
    
    old_pdpa_nav = '''    <li><a href="autonomous-ops.html" style="color:var(--electric)" data-i18n="navAutonomousOps">Autonomous Ops</a></li>
    <li><a href="flowmail.html">Flowmail</a></li>
    <li><a href="praxis.html">Praxis</a></li>
    <li><a href="ontrac.html">Ontrac</a></li>
    <li><a href="sensai.html">Sensai</a></li>
    <li><a href="integrall.html">Integrall</a></li>
    <li><a href="dutaconnect.html">DutaConnect</a></li>'''
    
    content = content.replace(old_pdpa_nav, new_product_nav)
    with open('/media/shamelali/Data/1-Projects/dutaintegraweb-main/public/pdpa.html', 'w') as f:
        f.write(content)
    print("Updated pdpa.html")

if __name__ == '__main__':
    update_duta_track()
    update_duta_flow()
    update_praxis()
    update_integrall()
    update_autonomous_ops()
    update_legal_pages()
    print("All static HTML files updated!")
