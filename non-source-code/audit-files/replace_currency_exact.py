import os

replacements = {
    "src/pages/pipeline/components/DealCard.tsx": [
        ("${(deal.dealValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K", "PKR ${(deal.dealValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k")
    ],
    "src/pages/dashboard/components/PipelineSummaryBar.tsx": [
        ("${(stage.totalValue / 1000).toFixed(0)}K", "PKR ${(stage.totalValue / 1000).toFixed(0)}k")
    ],
    "src/pages/dashboard/DashboardPage.tsx": [
        ("value={`$${(animatedEstCommission / 1000).toFixed(1)}k`}", "value={`PKR ${(animatedEstCommission / 1000).toFixed(1)}k`}"),
        ("value={`$${(animatedPipelineValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}", "value={`PKR ${(animatedPipelineValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}"),
        ("value={`$${(animatedForecast / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}", "value={`PKR ${(animatedForecast / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}")
    ],
    "src/pages/smart-lists/components/MicroCmaModal.tsx": [
        ("price: '$685,000'", "price: 'PKR 685,000'"),
        ("price: '$720,000'", "price: 'PKR 720,000'"),
        ("price: '$699,000'", "price: 'PKR 699,000'"),
        (">${targetValue.toLocaleString()}", ">PKR ${targetValue.toLocaleString()}"),
        (">+${(leadData.equityAmount || 0).toLocaleString()}", ">+PKR ${(leadData.equityAmount || 0).toLocaleString()}"),
        ("Low: ${lowRange.toLocaleString()}", "Low: PKR ${lowRange.toLocaleString()}"),
        ("Target: ${targetValue.toLocaleString()}", "Target: PKR ${targetValue.toLocaleString()}"),
        ("High: ${highRange.toLocaleString()}", "High: PKR ${highRange.toLocaleString()}"),
        ("• ${comp.pricePerSqft}/sqft", "• PKR ${comp.pricePerSqft}/sqft")
    ],
    "src/pages/cma/MicroCmaPage.tsx": [
        (">${pricePerSqft}/SqFt", ">PKR ${pricePerSqft}/SqFt"),
        (">${range.target.toLocaleString()}", ">PKR ${range.target.toLocaleString()}"),
        (">+${(prop.equity || 520000).toLocaleString()}", ">+PKR ${(prop.equity || 520000).toLocaleString()}"),
        ("Low: ${range.low.toLocaleString()}", "Low: PKR ${range.low.toLocaleString()}"),
        ("Target: ${range.target.toLocaleString()}", "Target: PKR ${range.target.toLocaleString()}"),
        ("High: ${range.high.toLocaleString()}", "High: PKR ${range.high.toLocaleString()}"),
        ("• ${comp.pricePerSqft}/sqft", "• PKR ${comp.pricePerSqft}/sqft"),
        (">${(comp.soldPrice || 0).toLocaleString()}", ">PKR ${(comp.soldPrice || 0).toLocaleString()}")
    ],
    "src/pages/portal/LeadPortalPage.tsx": [
        (">${deal.value.toLocaleString()}", ">PKR ${deal.value.toLocaleString()}")
    ],
    "src/pages/ai-isa/components/LiveAiConversations.tsx": [
        ("$750k", "PKR 750k")
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

