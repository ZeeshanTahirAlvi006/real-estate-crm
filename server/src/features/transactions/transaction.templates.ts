import { ITransactionMilestone, TransactionType } from '../../models/Transaction.js'

export const BUYER_MILESTONE_TEMPLATE: Array<Omit<ITransactionMilestone, 'dueDate' | 'completedAt' | 'completedBy' | 'completedByName'>> = [
  {
    id: 'm-buyer-1',
    title: 'Purchase Contract Executed & Escrow Opened',
    category: 'contract',
    status: 'completed',
    order: 1,
    notes: 'Mutual acceptance executed and earnest money instructions issued.',
  },
  {
    id: 'm-buyer-2',
    title: 'Earnest Money Deposited with Escrow Officer',
    category: 'contract',
    status: 'in_progress',
    order: 2,
    notes: 'Earnest money deposit required within 3 business days of acceptance.',
  },
  {
    id: 'm-buyer-3',
    title: 'Home Inspection & Specialty Tests Completed',
    category: 'inspection',
    status: 'pending',
    order: 3,
    notes: 'Physical inspection, roof inspection, and repair requests negotiation.',
  },
  {
    id: 'm-buyer-4',
    title: 'Mortgage Appraisal & Underwriting Approval',
    category: 'appraisal',
    status: 'pending',
    order: 4,
    notes: 'Lender appraisal ordered and initial loan commitment conditions met.',
  },
  {
    id: 'm-buyer-5',
    title: 'Title Commitment & HOA Disclosures Clear',
    category: 'title',
    status: 'pending',
    order: 5,
    notes: 'Review preliminary title report and HOA covenants/bylaws.',
  },
  {
    id: 'm-buyer-6',
    title: 'Homeowners Hazard Insurance Bound',
    category: 'financing',
    status: 'pending',
    order: 6,
    notes: 'Insurance declaration page delivered to lender for final closing clearance.',
  },
  {
    id: 'm-buyer-7',
    title: 'Final Walkthrough Inspection Verified',
    category: 'inspection',
    status: 'pending',
    order: 7,
    notes: 'Verify property condition and agreed-upon seller repairs prior to signing.',
  },
  {
    id: 'm-buyer-8',
    title: 'Closing Disclosure Signed & Buyer Funds Wired',
    category: 'closing',
    status: 'pending',
    order: 8,
    notes: 'Closing disclosure (CD) signed and remaining down payment wired to escrow.',
  },
  {
    id: 'm-buyer-9',
    title: 'Deed Recorded & Keys Handover',
    category: 'closing',
    status: 'pending',
    order: 9,
    notes: 'County recording completed and keys delivered to new homeowner.',
  },
]

export const SELLER_MILESTONE_TEMPLATE: Array<Omit<ITransactionMilestone, 'dueDate' | 'completedAt' | 'completedBy' | 'completedByName'>> = [
  {
    id: 'm-seller-1',
    title: 'Listing Agreement & Seller Disclosures Signed',
    category: 'contract',
    status: 'completed',
    order: 1,
    notes: 'Exclusive right to sell executed and property disclosures completed.',
  },
  {
    id: 'm-seller-2',
    title: 'Purchase Offer Accepted & Escrow Opened',
    category: 'contract',
    status: 'in_progress',
    order: 2,
    notes: 'Mutual offer executed with buyer.',
  },
  {
    id: 'm-seller-3',
    title: 'Buyer Earnest Money Receipt Confirmed',
    category: 'contract',
    status: 'pending',
    order: 3,
    notes: 'Escrow verifies earnest deposit held in trust.',
  },
  {
    id: 'm-seller-4',
    title: 'Buyer Physical Inspection Contingency Cleared',
    category: 'inspection',
    status: 'pending',
    order: 4,
    notes: 'Repair addendum resolved and buyer inspection contingency removed.',
  },
  {
    id: 'm-seller-5',
    title: 'Buyer Loan & Appraisal Contingency Cleared',
    category: 'appraisal',
    status: 'pending',
    order: 5,
    notes: 'Appraisal value met and mortgage commitment verified.',
  },
  {
    id: 'm-seller-6',
    title: 'Mortgage Payoff Statement & Title Cleared',
    category: 'title',
    status: 'pending',
    order: 6,
    notes: 'Existing mortgage payoff and municipal lien search verified.',
  },
  {
    id: 'm-seller-7',
    title: 'Seller Closing Documents Signed with Escrow',
    category: 'closing',
    status: 'pending',
    order: 7,
    notes: 'Warranty deed and settlement statement executed with notary.',
  },
  {
    id: 'm-seller-8',
    title: 'Funds Disbursed & Closing Completed',
    category: 'closing',
    status: 'pending',
    order: 8,
    notes: 'Wire disbursement of seller net proceeds and key transfer.',
  },
]

export const getMilestonesForType = (type: TransactionType = 'buyer') => {
  const template = type === 'seller' ? SELLER_MILESTONE_TEMPLATE : BUYER_MILESTONE_TEMPLATE
  return template.map((m) => ({
    ...m,
    dueDate: new Date(Date.now() + m.order * 3 * 24 * 60 * 60 * 1000), // Staggered by 3 days
    completedAt: m.status === 'completed' ? new Date() : undefined,
  }))
}
