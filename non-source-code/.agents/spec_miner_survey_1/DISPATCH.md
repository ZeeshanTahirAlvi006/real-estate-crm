## 2026-09-17T16:09:52Z

Task: Survey Frontend UI Architecture for Brokerage Attribution, Action Disabling & Tooltips.

Read ORIGINAL_REQUEST.md carefully.
Investigate the frontend (src/ directory) to map:
1. Contact Views & Components:
   - Contacts Table view (table columns, row rendering, contact name cell)
   - Contacts Grid view (card layout)
   - Contacts Kanban view (card layout)
   - Contact Detail Drawer & Contact Detail Page
   - Communication interfaces: Inbox, Dialer, Message modals/drawers
2. Outbound Action Buttons:
   - Call, WhatsApp, Send Message, Email, Share Portal / Portal Invite
   - Mutation action buttons: Edit contact, Delete contact, Add Note
   - How these buttons are rendered, where event handlers are bound
3. Brokerage Attribution UI Requirements:
   - Display resolved brokerageName as a subtle subtitle or pill badge directly beneath the contact's name in list (table, grid, kanban) and detail/drawer views
   - Visible ONLY to Super Admins (do not show for other roles; do NOT add a separate table column)
4. UI Action Restrictions & Tooltips:
   - When a Super Admin views a cross-brokerage contact (or when Super Admin has no assigned brokerage):
     - Hide or disable outbound action buttons (Call, WhatsApp, Send Message, Email, Share Portal)
     - Provide tooltip indicating cross-brokerage restriction
     - Hide or disable Edit, Delete, Add Note buttons
5. Frontend Types & Auth State:
   - User auth context / hooks (useAuth, user.role === 'super_admin', user.brokerageId)
   - Contact TypeScript interface / type definitions in src/

Write your comprehensive findings and implementation strategy to:
c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\spec_miner_survey_1\handoff.md
Send a completion message back when done.
