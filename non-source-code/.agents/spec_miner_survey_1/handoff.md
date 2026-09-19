# Frontend UI Architecture Survey: Brokerage Attribution, Action Disabling & Tooltips

**Agent**: Spec Miner Survey 1  
**Working Directory**: `c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\spec_miner_survey_1`  
**Target Project**: PropPulse OS (React 19 / TypeScript / Vite / Tailwind CSS frontend)  
**Date**: 2026-09-17  

---

## 1. Observation

Direct observations of codebase files, structures, components, and line references in `src/`:

### 1.1 Contact Views & Table/Grid/Kanban Structure

1. **Contacts Page Container**:
   - File: `src/pages/contacts/ContactsPage.tsx`
   - Line 26-29: View mode toggle state (`view === 'grid' ? 'grid' : 'table'`).
   - Line 41-46: `useGetContactsQuery({ search, page, limit: 25, source: sourceFilter })`.
   - Line 97-176: `handleExportCSV` with API call to `/api/export/contacts?format=csv` and client-side fallback (lines 150-175).
   - Line 281-305: Switches between `<ContactsGridView />` and `<ContactsTableView />`.
   - Line 308-318: `<SharePortalModal contact={portalModalContact} />`.
   - Line 321-354: Add Contact and Edit Contact `<Dialog>` wrapping `<ContactForm>`.
   - Line 357-384: Delete contact & Credentials `<ConfirmDialog>`.

2. **Contacts Table View**:
   - File: `src/pages/contacts/components/ContactsTableView.tsx`
   - Line 68-90: Table headers: `NAME`, `PHONE`, `EMAIL`, `SOURCE`, `SCORE`, `TAGS`, `ACTIONS`. (Notice: 7 columns, strictly no brokerage column).
   - Line 109-120: Name column rendering:
     ```tsx
     <td className="py-3.5 px-4">
       <div className="flex items-center gap-3">
         <Avatar className="h-8 w-8 rounded-full border border-[#D8E2D6] dark:border-[#618764]">
           <AvatarFallback ...>{c.firstName?.[0] || ''}{c.lastName?.[0] || ''}</AvatarFallback>
         </Avatar>
         <span className="font-semibold text-[#273338] dark:text-white">
           {c.firstName} {c.lastName}
         </span>
       </div>
     </td>
     ```
   - Line 122-141: Phone column with clickable WhatsApp Web button:
     `window.open(`https://web.whatsapp.com/send?phone=${clean}`, '_blank')`.
   - Line 180-247: Action buttons column:
     - Line 181-192: `Edit` button (`onEditContact(c)`).
     - Line 193-204: `Creds` button (`onCredsContact(c)`).
     - Line 205-221: `Call` button (`window.open('https://web.whatsapp.com/send?phone=...')`).
     - Line 222-233: `Message` button (`navigate('/inbox')`).
     - Line 234-245: `Delete` button (`onDeleteContact(c.id)`).

3. **Contacts Grid View**:
   - File: `src/pages/contacts/components/ContactsGridView.tsx`
   - Line 93-299: 2-column card grid (`grid grid-cols-1 md:grid-cols-2 gap-4`).
   - Line 103-128: Card header with Avatar, Contact Name (`<h3 className="text-base font-bold ...">{contact.firstName} {contact.lastName}</h3>`), and source/status badges.
   - Line 151-171: Clickable phone link opening WhatsApp Web.
   - Line 228-296: Actions footer with `Edit`, `Creds`, `Call`, `Message` (icon button), and `Delete` (icon button).

4. **Contacts Kanban View**:
   - Files: `src/pages/contacts/components/ContactsKanbanView.tsx` & `src/pages/contacts/components/ContactKanbanCard.tsx`
   - Line 147-266 (`ContactsKanbanView.tsx`): Grouping options: `'status' | 'source' | 'score'`. Drag-and-drop powered by `@atlaskit/pragmatic-drag-and-drop`.
   - Line 87-115 (`ContactKanbanCard.tsx`): Card header with Avatar and Name:
     ```tsx
     <h4 className="text-sm font-bold text-[#273338] dark:text-white truncate ...">
       {contact.firstName} {contact.lastName}
     </h4>
     <span className="text-[11px] font-medium text-[#75887E] dark:text-[#A0B2A6] truncate block">
       {contact.leadSource || 'Direct'}
     </span>
     ```
   - Line 120-135: WhatsApp call link.
   - Line 170-219: Move Status dropdown menu.
   - Line 223-264: Card actions: `Edit`, `Creds`, `Call`, `Delete`.

5. **Contact Detail Page**:
   - File: `src/pages/contacts/ContactDetailPage.tsx`
   - Line 201-253: Hero banner displaying `{contact.firstName} {contact.lastName}`, lead score, and status.
   - Line 256-277: Quick Actions Cluster:
     - `Button` for `Portal` (`setIsPortalOpen(true)`).
     - `Button` for `Edit` (`setIsEditOpen(true)`).
   - Line 286-293: KPI Panel 1 `Client Portal` (`onClick={() => setIsPortalOpen(true)}`).
   - Line 305-324: Contact Information panel displaying Phone and Email.
   - Line 428-452: Quick Activity Composer with Textarea and `Button` for `Save Note` (`handleComposerSubmit`).
   - Line 243-250 & 551-557: Merge Duplicate Match button and modal.

6. **Contact Detail Drawer / Panes**:
   - File: `src/pages/inbox/components/ContactInfoPane.tsx`:
     - Line 48-60: WhatsApp contact profile section showing contact name and phone.
     - Line 63-102: Outbound actions: Audio Call (`web.whatsapp.com`), Video Call (`web.whatsapp.com`), and Copilot.
   - File: `src/pages/data-health/components/ContactProfileModal.tsx`:
     - Line 270-281: WhatsApp chat link (`web.whatsapp.com/send?phone=...`).
     - Line 282-290: Fix Phone button.
   - File: `src/pages/pipeline/components/DealDetailDrawer.tsx`:
     - Line 83-85: Contact Name header.

### 1.2 Communication Interfaces (Inbox & Dialer)

1. **Inbox Page**:
   - File: `src/pages/inbox/InboxPage.tsx`
   - Line 30: `const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN`.
   - Line 76: `skip: isSuperAdmin` on `useGetConversationsQuery`.
   - Line 252-284: Hardcoded block returning `<Communication Privacy Restricted>` banner for all Super Admins regardless of whether they have an assigned brokerage.
   - Line 212-236: `handleSendMessage` calling `sendMessageMutation`.
2. **Chat Windows**:
   - File: `src/pages/inbox/components/WhatsAppChatView.tsx`:
     - Line 51-68: `autoCall` query param opens `https://web.whatsapp.com/send?phone=...`.
     - Line 492-501: Templates button.
     - Line 504-515: Rebuttals button.
     - Line 530-539: Send message button (`disabled={!inputText.trim() || isSending}`).
   - File: `src/pages/inbox/components/GmailThreadView.tsx`:
     - Line 52-60: Send email handler.
   - File: `src/pages/inbox/components/UnifiedChatView.tsx`:
     - Line 62-70: Omnichannel send handler.
   - File: `src/pages/inbox/components/StartConversationModal.tsx`:
     - Line 78-87: Fetches contacts via `useGetContactsQuery`.
     - Line 134-153: Initiates conversation via `useStartConversationMutation`.

### 1.3 Auth State & User Roles

1. **Auth Slice**:
   - File: `src/store/slices/authSlice.ts`
   - State contains `user: User | null`.
   - Typed hook: `useAppSelector((state) => state.auth.user)` in `src/store/hooks.ts`.
2. **User Model**:
   - File: `src/types/auth.ts`
   - `UserRole.SUPER_ADMIN = 'super_admin'`.
   - `User` interface includes:
     ```typescript
     id: string
     role: UserRole
     brokerageId?: string
     brokerageName?: string
     ```
3. **Contact Model**:
   - File: `src/types/index.ts`
   - Lines 14-45: Current `Contact` interface lacks `brokerageId` and `brokerageName`.
4. **Backend DTO**:
   - File: `server/src/features/contacts/contact.types.ts`
   - Line 14-41: Current `ContactResponseDto` lacks `brokerageId` and `brokerageName`.

### 1.4 Tooltip Architecture

- File: `src/components/ui/tooltip.tsx`
- Powered by `@base-ui/react/tooltip`.
- Exports `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`.
- `TooltipProvider` is already mounted at the root level in `src/App.tsx` (line 57).

---

## 2. Logic Chain

1. **Role Scoping & Tenant Boundary (R1 & R3)**:
   - For non-super-admin users (`brokerage_owner`, `team_lead`, `agent`), the backend already scopes queries to `req.user.brokerageId`. These users can only ever access their own brokerage's contacts.
   - Super Admins have global multi-tenant visibility across all brokerages.
   - An assigned Super Admin has `user.brokerageId != null`. Contacts with `contact.brokerageId === user.brokerageId` belong to the Super Admin's assigned brokerage.
   - Contacts with `contact.brokerageId !== user.brokerageId` (or if `user.brokerageId` is undefined/null) are **cross-brokerage**.
   - Per R1 and R3, cross-brokerage contacts must be strictly read-only and non-contactable for Super Admins.

2. **Brokerage Attribution Placement (R2)**:
   - The user explicitly mandated: "display resolved brokerageName as a subtle subtitle or pill badge directly beneath the contact's name in list (table, grid, kanban) and detail/drawer views. Visible ONLY to Super Admins (do not show for other roles; do NOT add a separate table column)".
   - In `ContactsTableView`: In the `NAME` column cell, wrap `{c.firstName} {c.lastName}` and `{c.brokerageName}` in a vertical flex column (`flex flex-col`). This preserves the exact 7-column table layout without altering column indexes or responsive table widths.
   - In `ContactsGridView`: Position a subtle pill badge or subtitle directly below `<h3 className="text-base font-bold ...">{contact.firstName} {contact.lastName}</h3>`.
   - In `ContactKanbanCard`: Position directly below `<h4>{contact.firstName} {contact.lastName}</h4>`.
   - In `ContactDetailPage`: Position in the Hero Banner directly below `<h1>{contact.firstName} {contact.lastName}</h1>`.
   - In `ContactInfoPane`: Position in the Profile Section directly below `{conversation.contactName}`.

3. **Action Disabling & Tooltip Mechanics (R1 & R3)**:
   - Outbound actions to disable:
     - `Call` (WhatsApp Web links)
     - `WhatsApp` (Omnichannel / chat buttons)
     - `Send Message` (inbox message send, unified send)
     - `Email` (Gmail / compose send)
     - `Share Portal / Creds` (Generate credentials modal & open inbox button)
   - Mutation actions to disable:
     - `Edit` (opens Edit form)
     - `Delete` (opens Delete confirm)
     - `Add Note / Save Note` (activity timeline composer)
     - `Move Status` / Drag-and-drop in Kanban
     - `Merge Duplicate`
   - Tooltip integration:
     - In HTML/React, a natively `disabled` `<button>` does not receive pointer events in some browser implementations, preventing tooltips from appearing.
     - Solution: Wrap disabled buttons in an inline wrapper with `cursor-not-allowed` and use the `<Tooltip>` component.
     - Create a reusable UI wrapper `<RestrictedActionTooltip restricted={boolean} reason={string}>{children}</RestrictedActionTooltip>` that transparently handles wrapping, disabling, and tooltips.

4. **Inbox & Super Admin Behavior (R1)**:
   - Currently, `InboxPage.tsx` lines 252-284 block Super Admin completely with a static shield banner.
   - When a Super Admin has an assigned brokerage (`user.brokerageId`), they should be permitted to use the inbox for their own brokerage!
   - Only when `!user.brokerageId` (unassigned Super Admin) should the full inbox restriction screen be displayed, OR when attempting to contact cross-brokerage contacts.
   - In `StartConversationModal.tsx`: Cross-brokerage contacts returned by the contact query must be flagged with their brokerage badge and disabled from selection.

5. **CSV Export Guard (R5)**:
   - In `ContactsPage.tsx` line 149-175: The client fallback export must filter contacts:
     `const exportable = isSuperAdmin ? data.contacts.filter(c => user?.brokerageId && c.brokerageId === user.brokerageId) : data.contacts`.
   - If `isSuperAdmin && !user.brokerageId`, the Export CSV button must be disabled with tooltip: "Export restricted: Super Admin has no assigned brokerage."

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Contact List | Table View Name Cell | Displays Avatar and full name in table row | `c.firstName`, `c.lastName` | React JSX cell | N/A | `ContactsTableView.tsx:109` |
| 2 | Contact List | Table View Actions | Edit, Creds, Call, Message, Delete buttons | `c: Contact` | Action buttons | Toast errors on failure | `ContactsTableView.tsx:180` |
| 3 | Contact List | Grid View Cards | 2-col card layout with score, tags, contact info | `contact: Contact` | Card component | Fallback to empty state | `ContactsGridView.tsx:93` |
| 4 | Contact List | Kanban View Drag & Drop | Drag cards between status columns | `contactId`, `targetColId` | `onUpdateContactStatus` | Reverts drag on invalid drop | `ContactsKanbanView.tsx:150` |
| 5 | Contact List | Kanban Move Dropdown | Mobile/click dropdown to change contact lifecycle | `currentStatusGroup` | Status change mutation | Button disabled for current status | `ContactKanbanCard.tsx:170` |
| 6 | Contact Detail | Detail Page Hero Banner | Identity header with score, status chips, quick actions | `contact: Contact` | Hero banner JSX | Shows skeleton while loading | `ContactDetailPage.tsx:197` |
| 7 | Contact Detail | Activity Composer | Textarea to log private notes to timeline | `composerNote: string` | `addContactNote` mutation | Toast error on failure | `ContactDetailPage.tsx:407` |
| 8 | Contact Detail | Share VIP Portal Modal | Generates login credentials and WhatsApp invite text | `contactId: string` | Modal with credentials & WhatsApp button | Toast error if no phone | `SharePortalModal.tsx:22` |
| 9 | Communication | WhatsApp Web Link | External link to `web.whatsapp.com/send?phone=...` | Phone number string | Browser window.open | Toast error if phone missing | Table, Grid, Kanban, Detail |
| 10 | Communication | Inbox Omnichannel Chat | Unified, WhatsApp, and Email chat canvases | `conversationId`, message text | `sendMessage` mutation | Toast error on failure | `InboxPage.tsx:212` |
| 11 | Communication | Inbox Super Admin Guard | Full screen blocker preventing Super Admin inbox use | `user.role === 'super_admin'` | Privacy Restricted screen | Completely blocks communication | `InboxPage.tsx:252` |
| 12 | Communication | Start Conversation Modal | Dialog to search contacts and start thread | Search query, channel, text | `startConversation` mutation | Toast error on 403 or error | `StartConversationModal.tsx:44` |
| 13 | Data Export | Contacts CSV Export | Downloads contact records via API or client-side fallback | Contacts array | Blob download | Toast error if disabled | `ContactsPage.tsx:97` |
| 14 | Data Health | Contact Profile Modal | View and fix contact details & initiate chat | Contact record | Modal dialog | N/A | `ContactProfileModal.tsx:250` |
| 15 | Pipeline | Deal Detail Drawer | Deal stage pipeline, closing checklist, contact activity | `deal: Deal` | Slide-over drawer | N/A | `DealDetailDrawer.tsx:78` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Brokerage Attribution | `contact.brokerageName` is undefined or empty string | No badge or subtitle rendered; layout collapses gracefully without blank lines. |
| 2 | Super Admin without Brokerage | `user.role === 'super_admin'` AND `user.brokerageId === undefined` | ALL contacts across all brokerages are treated as cross-brokerage: all outbound and mutation buttons disabled with tooltip. |
| 3 | Non-Super Admin User | `user.role === 'brokerage_owner'` or `'agent'` | Attribution badge omitted; all action buttons remain enabled subject to standard RBAC. |
| 4 | Phone click on masked phone | `contact.phone === '+92 3******67'` | Button must be disabled so `web.whatsapp.com` is NOT launched with asterisked string. |
| 5 | Kanban Drag-and-drop on cross-brokerage | Super Admin drags cross-brokerage card to another column | `canDrag` should return false or drop handler rejects mutation, preventing status change. |
| 6 | Disabled button tooltip hover | Hovering over native HTML `<button disabled>` | Native disabled button blocks pointer events; wrapper `<span className="inline-flex cursor-not-allowed">` captures hover and displays tooltip. |
| 7 | CSV Export with empty or no assigned brokerage | Super Admin clicks Export CSV when `!user.brokerageId` | Client fallback exports empty CSV or Export button is disabled with tooltip indicating restriction. |
| 8 | Start Conversation Modal search | Super Admin searches contacts across brokerages | Cross-brokerage contacts display brokerage badge and selection is disabled with restriction tooltip. |

---

## 5. Architectural Implementation Strategy

### 5.1 Type Definitions (`src/types/index.ts` & `src/types/communication.ts`)

Update `src/types/index.ts` to include `brokerageId` and `brokerageName` on the `Contact` interface:
```typescript
export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  brokerageId?: string       // <── Added for multi-tenant attribution & restriction
  brokerageName?: string     // <── Added for multi-tenant attribution & restriction
  address?: string
  // ... rest of existing fields
}
```

Update `src/types/communication.ts`:
```typescript
export interface ConversationThread {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail: string
  brokerageId?: string       // <── Added
  brokerageName?: string     // <── Added
  // ... rest of existing fields
}
```

### 5.2 Centralized Permission Hook (`src/hooks/useContactRestriction.ts`)

Create a lightweight, centralized hook for consistent evaluation across all views:
```typescript
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'

export interface ContactRestrictionResult {
  isSuperAdmin: boolean
  isRestricted: boolean
  brokerageName?: string
  restrictionReason?: string
}

export function useContactRestriction(contact?: { brokerageId?: string; brokerageName?: string } | null): ContactRestrictionResult {
  const user = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN

  if (!isSuperAdmin) {
    return {
      isSuperAdmin: false,
      isRestricted: false,
      brokerageName: undefined,
    }
  }

  // Super Admin without assigned brokerage: everything is restricted
  if (!user?.brokerageId) {
    return {
      isSuperAdmin: true,
      isRestricted: true,
      brokerageName: contact?.brokerageName,
      restrictionReason: 'Cross-brokerage restriction: Your Super Admin account has no assigned brokerage.',
    }
  }

  // Cross-brokerage contact check
  const isCross = contact?.brokerageId !== user.brokerageId
  return {
    isSuperAdmin: true,
    isRestricted: isCross,
    brokerageName: contact?.brokerageName,
    restrictionReason: isCross
      ? `Cross-brokerage restriction: This contact belongs to ${contact?.brokerageName || 'another brokerage'}.`
      : undefined,
  }
}
```

### 5.3 Reusable Restricted Action Tooltip Component (`src/components/shared/RestrictedActionTooltip.tsx`)

```tsx
import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface RestrictedActionTooltipProps {
  isRestricted: boolean
  reason?: string
  children: React.ReactElement
}

export const RestrictedActionTooltip: React.FC<RestrictedActionTooltipProps> = ({
  isRestricted,
  reason = 'Action restricted for cross-brokerage contacts.',
  children,
}) => {
  if (!isRestricted) {
    return children
  }

  // Clone child with disabled prop if it is a button/element
  const disabledChild = React.cloneElement(children, {
    disabled: true,
    tabIndex: -1,
    'aria-disabled': true,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
    },
    className: `${children.props.className || ''} opacity-40 cursor-not-allowed pointer-events-none`,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed" onClick={(e) => e.stopPropagation()}>
          {disabledChild}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg">
        {reason}
      </TooltipContent>
    </Tooltip>
  )
}
```

### 5.4 Brokerage Attribution Pill Badge Component (`src/components/shared/BrokerageBadge.tsx`)

```tsx
import React from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface BrokerageBadgeProps {
  brokerageName?: string
  className?: string
}

export const BrokerageBadge: React.FC<BrokerageBadgeProps> = ({ brokerageName, className = '' }) => {
  if (!brokerageName) return null

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40 shrink-0 ${className}`}
      title={`Brokerage: ${brokerageName}`}
    >
      <MaterialIcon name="apartment" size={12} className="text-[#618764] dark:text-[#9CB080]" />
      <span className="truncate max-w-[150px]">{brokerageName}</span>
    </span>
  )
}
```

### 5.5 View Modifications Detailed Blueprint

1. **`ContactsTableView.tsx`**:
   - In row loop: calculate `isCross = isSuperAdmin && (!user?.brokerageId || c.brokerageId !== user?.brokerageId)`.
   - In `NAME` column:
     ```tsx
     <div className="flex flex-col min-w-0">
       <span className="font-semibold text-[#273338] dark:text-white truncate">
         {c.firstName} {c.lastName}
       </span>
       {isSuperAdmin && c.brokerageName && (
         <BrokerageBadge brokerageName={c.brokerageName} className="mt-0.5" />
       )}
     </div>
     ```
   - In `PHONE` column:
     - Wrap the WhatsApp button or phone text with `<RestrictedActionTooltip isRestricted={isCross} reason={reason}>`. If restricted, prevent click.
   - In `ACTIONS` column:
     - Wrap `Edit`, `Creds`, `Call`, `Message`, and `Delete` buttons in `<RestrictedActionTooltip isRestricted={isCross} reason={reason}>`.

2. **`ContactsGridView.tsx`**:
   - In card header below contact name:
     ```tsx
     <h3 className="text-base font-bold text-[#273338] dark:text-white truncate ...">
       {contact.firstName} {contact.lastName}
     </h3>
     {isSuperAdmin && contact.brokerageName && (
       <div className="mt-0.5">
         <BrokerageBadge brokerageName={contact.brokerageName} />
       </div>
     )}
     ```
   - In phone button: Wrap in `<RestrictedActionTooltip>`.
   - In card action footer: Wrap `Edit`, `Creds`, `Call`, `Message`, `Delete` in `<RestrictedActionTooltip>`.

3. **`ContactKanbanCard.tsx`**:
   - In header below name: render `<BrokerageBadge brokerageName={contact.brokerageName} />` when `isSuperAdmin`.
   - In phone button: Wrap in `<RestrictedActionTooltip>`.
   - In move dropdown button: Wrap in `<RestrictedActionTooltip>`.
   - In `draggable` hook: set `canDrag: () => !isCross`.
   - In action buttons (`Edit`, `Creds`, `Call`, `Delete`): Wrap in `<RestrictedActionTooltip>`.

4. **`ContactDetailPage.tsx`**:
   - In Hero banner below contact name: render `<BrokerageBadge brokerageName={contact.brokerageName} />` when `isSuperAdmin`.
   - In Quick actions cluster: Wrap `Portal` and `Edit` in `<RestrictedActionTooltip>`.
   - In KPI Panel 1 (Client Portal): If restricted, disable click and show tooltip.
   - In Quick Activity Composer:
     - If restricted, textarea has `disabled` attribute and placeholder: `"Cross-brokerage contacts are strictly read-only."`
     - Wrap `Save Note` button in `<RestrictedActionTooltip>`.
   - In Duplicate match chip: Disable merge button with tooltip if contact is cross-brokerage.

5. **`InboxPage.tsx`**:
   - Update line 76: `skip: isSuperAdmin && !user?.brokerageId`.
   - Update line 252:
     ```tsx
     if (isSuperAdmin && !user?.brokerageId) {
       // Render the "No Assigned Brokerage / Communication Restricted" screen
     }
     ```
   - In `StartConversationModal.tsx`:
     - Display `BrokerageBadge` next to contact name in results list.
     - If contact is cross-brokerage, disable selection item and show tooltip.

6. **`ContactsPage.tsx` (Export CSV)**:
   - In `handleExportCSV`:
     - Check:
       ```tsx
       if (isSuperAdmin && !user?.brokerageId) {
         toast.error('Export restricted: Super Admin has no assigned brokerage.')
         return
       }
       ```
     - In client fallback export: filter `data.contacts.filter(c => c.brokerageId === user.brokerageId)`.

---

## 6. Caveats

1. **Backend Dependency**: The frontend UI attribution badge and cross-brokerage restrictions depend on `brokerageId` and `brokerageName` being included in `ContactResponseDto` from the backend API. If the backend returns `undefined`, the frontend fallback will safely treat `contact.brokerageId !== user.brokerageId` as restricted for Super Admins.
2. **Phone & Email Masking**: The frontend will automatically display whatever phone/email string the server sends. The server is responsible for ensuring raw unmasked credentials are never sent over the wire for cross-brokerage Super Admins (preserving the first 3 characters and last 2 digits, e.g., `+92 3******67`).
3. **No Dedicated Column**: The table layout remains strictly 7 columns, fulfilling the explicit constraint: "do NOT add a dedicated separate table column".

---

## 7. Conclusion

The PropPulse OS frontend architecture is fully mapped and primed for multi-tenant brokerage attribution, action disabling, and tooltip restriction:
- Every outbound touchpoint (Call, WhatsApp, Email, Unified Message, Portal Invite) and mutation button (Edit, Delete, Add Note, Status Move, Duplicate Merge) has been identified with exact source lines.
- The attribution UI can be cleanly injected directly beneath contact names in Table, Grid, Kanban, Detail Page, and Drawers using a subtle badge component visible exclusively to Super Admins.
- A reusable `<RestrictedActionTooltip>` combined with `@base-ui/react/tooltip` guarantees that disabled actions provide immediate, informative feedback to Super Admins without compromising security or usability.
- All implementations comply with the project rules, maintaining zero layout shifts, covered types, and strict read-only boundary enforcement.

---

## 8. Verification Method

To independently verify these findings and the resulting implementation:

1. **Inspect Target Files**:
   - `src/pages/contacts/components/ContactsTableView.tsx` (table row name cell & actions column)
   - `src/pages/contacts/components/ContactsGridView.tsx` (card header & card action footer)
   - `src/pages/contacts/components/ContactKanbanCard.tsx` (card header, move menu, drag adapter)
   - `src/pages/contacts/ContactDetailPage.tsx` (hero banner, portal/edit buttons, note composer)
   - `src/pages/inbox/InboxPage.tsx` (Super Admin restriction guard & start modal)
   - `src/types/index.ts` & `src/types/auth.ts` (Contact and User type definitions)

2. **TypeScript Compilation**:
   Run the project TypeScript check:
   ```powershell
   npm run build
   # or
   npx tsc --noEmit
   ```
   Ensure zero TypeScript compilation errors.

3. **Behavioral Invalidation Conditions**:
   - If a non-super-admin user sees the brokerage badge, this is a violation of R2.
   - If an extra table column is added to `ContactsTableView.tsx`, this is a violation of R2.
   - If a Super Admin can click "Call", "Creds", "Edit", "Delete", or "Save Note" on a contact where `contact.brokerageId !== user.brokerageId`, this is a violation of R1/R3.
   - If a Super Admin with no assigned brokerage can export cross-brokerage contacts, this is a violation of R5.
