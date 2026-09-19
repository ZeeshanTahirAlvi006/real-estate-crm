import os

replacements = {
    "src/pages/settings/components/TeamManagementTab.tsx": [
        ("Annual Cap ($)", "Annual Cap (PKR)")
    ],
    "src/pages/leads/components/ManualLeadModal.tsx": [
        ("Budget / Price ($)", "Budget / Price (PKR)")
    ],
    "src/pages/pipeline/components/CommissionCalculatorModal.tsx": [
        ("Annual Cap ($)", "Annual Cap (PKR)")
    ],
    "src/pages/leads/components/LeadCaptureWidgetTab.tsx": [
        ("Price / Budget ($)", "Price / Budget (PKR)")
    ],
    "src/pages/commissions/CommissionsPage.tsx": [
        ("Annual Cap Amount ($)", "Annual Cap Amount (PKR)")
    ],
    "src/pages/leads/components/ScoringConfigTab.tsx": [
        ("Property Price ($)", "Property Price (PKR)")
    ]
}

base_dir = r"c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm"

for rel_path, reps in replacements.items():
    file_path = os.path.join(base_dir, rel_path)
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old, new in reps:
            new_content = new_content.replace(old, new)
            
        if content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {rel_path}")
        else:
            print(f"No changes in {rel_path}")
    else:
        print(f"File not found: {rel_path}")

