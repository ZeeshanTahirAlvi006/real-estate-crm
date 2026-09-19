import os
import re

files_to_process = {
    "src/pages/pipeline/PipelinePage.tsx": [
        (r'\$\{deal.dealValue.toLocaleString\(\)\}', r'${formatCurrency(deal.dealValue)}')
    ],
    "src/pages/pipeline/components/PipelineColumn.tsx": [
        (r'Total: \$', r'Total: PKR '),
        (r'Forecast: \$', r'Forecast: PKR '),
        (r'\}K', r'}k')
    ],
    "src/pages/pipeline/components/DealCard.tsx": [
        (r'\$\{\(deal\.dealValue \/ 1000\)\.toFixed\(0\)\}K', r'PKR ${(deal.dealValue / 1000).toFixed(0)}k')
    ],
    "src/pages/pipeline/components/DealModal.tsx": [
        (r'Deal Value \(\$\)', r'Deal Value (PKR)')
    ],
    "src/pages/pipeline/components/CommissionCalculatorModal.tsx": [
        (r'Deal Sale Price \(\$\)', r'Deal Sale Price (PKR)'),
        (r'TC Coordinator \(\$\)', r'TC Coordinator (PKR)'),
        (r'Agent Payout: \$', r'Agent Payout: PKR '),
        (r'Gross GCI: \$', r'Gross GCI: PKR '),
        (r'Brokerage Profit: \$', r'Brokerage Profit: PKR '),
        (r'Franchise Royalty: \$', r'Franchise Royalty: PKR ')
    ],
    "src/pages/transactions/components/ConvertDealModal.tsx": [
        (r'Final Purchase Price \(\$\)', r'Final Purchase Price (PKR)'),
        (r'Earnest Money Deposit \(\$\)', r'Earnest Money Deposit (PKR)')
    ],
    "src/pages/commissions/CommissionsPage.tsx": [
        (r'Price \(\$\)', r'Price (PKR)'),
        (r'TC Fee \(\$\)', r'TC Fee (PKR)'),
        (r'E&O \(\$\)', r'E&O (PKR)'),
        (r'Desk Fee \(\$\)', r'Desk Fee (PKR)')
    ],
    "src/pages/dashboard/DashboardPage.tsx": [
        (r"value: '\$'", r"value: 'PKR '"),
        (r"prefix: '\$'", r"prefix: 'PKR '"),
        (r"prefix='\$\'", r"prefix='PKR '"),
        (r'value="\$"', r'value="PKR "'),
        (r'prefix="\$"', r'prefix="PKR "'),
        (r'formatter=\{\(value\) => `\$', r'formatter={(value) => `PKR '),
        (r'\$ \{', r'PKR {')
    ],
    "src/pages/dashboard/components/PipelineSummaryBar.tsx": [
        (r'\$\{\(total \/ 1000\)\.toFixed\(0\)\}k', r'PKR ${(total / 1000).toFixed(0)}k'),
        (r'\$\{\(stage\.value \/ 1000\)\.toFixed\(0\)\}k', r'PKR ${(stage.value / 1000).toFixed(0)}k')
    ],
    "src/pages/dashboard/components/LeadsOverTimeChart.tsx": [
        (r'Pipeline Value \(\$k\)', r'Pipeline Value (PKR k)'),
        (r'`\$\$\{val\}k`', r'`PKR ${val}k`')
    ],
    "src/pages/smart-lists/components/SellerRadarTab.tsx": [
        (r'\$\$\{', r'PKR ${'),
        (r'\$ \{', r'PKR {')
    ],
    "src/pages/smart-lists/components/MicroCmaModal.tsx": [
        (r'\$\$\{', r'PKR ${')
    ],
    "src/pages/cma/MicroCmaPage.tsx": [
        (r'\$\$\{', r'PKR ${'),
        (r'Estimated Net Equity: \$', r'Estimated Net Equity: PKR '),
        (r'Price/SqFt: \$', r'Price/SqFt: PKR ')
    ],
    "src/pages/portal/LeadPortalPage.tsx": [
        (r'\$\$\{deal\.value\.toLocaleString\(\)\}', r'PKR ${deal.value.toLocaleString()}')
    ],
    "src/components/ai-copilot/CopilotDrawer.tsx": [
        (r'\(\$650k - \$800k\)', r'(PKR 650k - 800k)')
    ],
    "src/pages/ai-isa/components/LiveAiConversations.tsx": [
        (r'\$750k', r'PKR 750k')
    ],
    "src/pages/settings/components/GlobalMarketTab.tsx": [
        (r"useState\('USD'\)", r"useState('PKR')"),
        (r"value: 'USD', label: 'USD \(\$\) — US Dollar'", r"value: 'PKR', label: 'PKR (Rs) — Pakistani Rupee'"),
        (r"value='USD'", r"value='PKR'")
    ]
}

base_dir = r"c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm"

for rel_path, replacements in files_to_process.items():
    file_path = os.path.join(base_dir, rel_path)
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old, new in replacements:
            new_content = re.sub(old, new, new_content)
            
        if content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {rel_path}")
        else:
            print(f"No changes in {rel_path} (maybe pattern mismatch?)")
    else:
        print(f"File not found: {rel_path}")

