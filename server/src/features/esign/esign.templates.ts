export interface ESignContractTemplate {
  id: string
  title: string
  description: string
  category: 'purchase' | 'agency' | 'disclosure' | 'lease'
  pageCount: number
  documentUrl: string
  defaultSigners: Array<{ role: 'buyer' | 'seller' | 'agent' | 'broker'; label: string }>
  defaultFields: Array<{
    type: 'signature' | 'initials' | 'date' | 'text'
    role: 'buyer' | 'seller' | 'agent' | 'broker'
    page: number
    x: number
    y: number
    width: number
    height: number
    required: boolean
    label: string
  }>
}

export const STANDARD_CONTRACT_TEMPLATES: ESignContractTemplate[] = [
  {
    id: 'tpl-purchase-agreement',
    title: 'Standard Residential Purchase & Sale Agreement',
    description: 'Legally binding residential contract for offer, escrow terms, financing contingencies, and closing dates.',
    category: 'purchase',
    pageCount: 3,
    documentUrl: '/sample-contracts/purchase-agreement.pdf',
    defaultSigners: [
      { role: 'buyer', label: 'Primary Buyer' },
      { role: 'seller', label: 'Property Seller' },
      { role: 'agent', label: 'Listing / Selling Broker' },
    ],
    defaultFields: [
      // Page 1: Earnest & Financing
      { type: 'initials', role: 'buyer', page: 1, x: 80, y: 92, width: 14, height: 5, required: true, label: 'Buyer Initials' },
      { type: 'initials', role: 'seller', page: 1, x: 62, y: 92, width: 14, height: 5, required: true, label: 'Seller Initials' },
      // Page 2: Contingencies & Inspections
      { type: 'initials', role: 'buyer', page: 2, x: 80, y: 92, width: 14, height: 5, required: true, label: 'Buyer Initials' },
      { type: 'initials', role: 'seller', page: 2, x: 62, y: 92, width: 14, height: 5, required: true, label: 'Seller Initials' },
      // Page 3: Execution Signatures
      { type: 'signature', role: 'buyer', page: 3, x: 15, y: 72, width: 32, height: 7, required: true, label: 'Buyer Signature' },
      { type: 'date', role: 'buyer', page: 3, x: 50, y: 73, width: 20, height: 5, required: true, label: 'Date Signed' },
      { type: 'signature', role: 'seller', page: 3, x: 15, y: 83, width: 32, height: 7, required: true, label: 'Seller Signature' },
      { type: 'date', role: 'seller', page: 3, x: 50, y: 84, width: 20, height: 5, required: true, label: 'Date Signed' },
      { type: 'signature', role: 'agent', page: 3, x: 15, y: 93, width: 32, height: 6, required: false, label: 'Broker Signature' },
    ],
  },
  {
    id: 'tpl-buyer-agency',
    title: 'Exclusive Buyer Representation Agreement',
    description: 'Brokerage client relationship disclosure establishing fiduciary duties and broker commission terms.',
    category: 'agency',
    pageCount: 2,
    documentUrl: '/sample-contracts/buyer-agency.pdf',
    defaultSigners: [
      { role: 'buyer', label: 'Client / Buyer' },
      { role: 'agent', label: 'Designated Agent' },
    ],
    defaultFields: [
      { type: 'initials', role: 'buyer', page: 1, x: 82, y: 93, width: 12, height: 5, required: true, label: 'Buyer Initials' },
      { type: 'signature', role: 'buyer', page: 2, x: 15, y: 75, width: 35, height: 7, required: true, label: 'Buyer Signature' },
      { type: 'date', role: 'buyer', page: 2, x: 55, y: 76, width: 20, height: 5, required: true, label: 'Date' },
      { type: 'signature', role: 'agent', page: 2, x: 15, y: 87, width: 35, height: 7, required: true, label: 'Agent Signature' },
      { type: 'date', role: 'agent', page: 2, x: 55, y: 88, width: 20, height: 5, required: true, label: 'Date' },
    ],
  },
  {
    id: 'tpl-property-disclosure',
    title: 'Seller Real Property Disclosure Statement',
    description: 'Mandatory structural, environmental, roof, plumbing, and material defect statutory disclosures.',
    category: 'disclosure',
    pageCount: 2,
    documentUrl: '/sample-contracts/property-disclosure.pdf',
    defaultSigners: [
      { role: 'seller', label: 'Property Owner / Seller' },
      { role: 'buyer', label: 'Buyer Acknowledgment' },
    ],
    defaultFields: [
      { type: 'initials', role: 'seller', page: 1, x: 80, y: 92, width: 14, height: 5, required: true, label: 'Seller Initials' },
      { type: 'signature', role: 'seller', page: 2, x: 15, y: 78, width: 34, height: 7, required: true, label: 'Seller Signature' },
      { type: 'date', role: 'seller', page: 2, x: 52, y: 79, width: 20, height: 5, required: true, label: 'Date' },
      { type: 'signature', role: 'buyer', page: 2, x: 15, y: 89, width: 34, height: 7, required: true, label: 'Buyer Receipt Signature' },
      { type: 'date', role: 'buyer', page: 2, x: 52, y: 90, width: 20, height: 5, required: true, label: 'Date' },
    ],
  },
]
