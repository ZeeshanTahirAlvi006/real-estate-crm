export interface StepByStepTask {
  id: string
  title: string
  description: string
  prerequisites?: string[]
  steps: {
    stepNumber: number
    instruction: string
    detail?: string
    actionLabel?: string
    actionTarget?: string
  }[]
  expectedResult: string
}

export interface WorkaroundItem {
  id: string
  issue: string
  cause: string
  symptoms: string[]
  recommendedWorkaround: {
    title: string
    steps: string[]
  }
  alternativeWorkaround?: {
    title: string
    steps: string[]
  }
}

export interface SystemCapability {
  title: string
  description: string
  specMetric?: string
}

export interface SystemLimitation {
  title: string
  description: string
  impact: string
  remedyRecommendation: string
}

export interface ProTip {
  title: string
  content: string
}

export interface FeatureGuide {
  id: string
  title: string
  subtitle: string
  category: 'Command Center' | 'Communications' | 'Telephony' | 'AI Intelligence' | 'Sales Pipeline' | 'Data Quality' | 'Automation' | 'Administration' | 'Access'
  routePatterns: string[]
  overview: string
  capabilities: SystemCapability[]
  stepByStepTasks: StepByStepTask[]
  workarounds: WorkaroundItem[]
  limitations: SystemLimitation[]
  proTips: ProTip[]
  quickLinks?: { label: string; to: string }[]
}

export const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: 'dashboard',
    title: 'Executive Dashboard & KPI Hub',
    subtitle: 'Real-time pipeline analytics, speed-to-lead velocity, and instant action center',
    category: 'Command Center',
    routePatterns: ['/dashboard', '/'],
    overview:
      'The Dashboard serves as the central mission control for PropPulse OS. It consolidates your entire sales velocity, speed-to-lead response times, active inbound opportunities, deal conversion stages, and live system activity feeds into a single unified view.',
    capabilities: [
      {
        title: 'Real-Time Pipeline Rollup',
        description: 'Instant visualization of total deal pipeline volume, active deal counts, and stage conversion velocity.',
        specMetric: 'Sub-second recalculation',
      },
      {
        title: 'Speed-to-Lead Tracker',
        description: 'Measures autonomous AI ISA and agent response times against industry benchmark of under 30 seconds.',
        specMetric: '28s average response',
      },
      {
        title: 'Multi-Channel Inbound Feed',
        description: 'Streams live events across Zillow, Meta Ads, WhatsApp, SMS, Webhooks, and direct inbound calls.',
        specMetric: 'Real-time WebSocket stream',
      },
    ],
    stepByStepTasks: [
      {
        id: 'dash-kpi-analysis',
        title: 'How to Monitor & Audit Real-Time Performance KPIs',
        description: 'Review your key business metrics to identify lead drop-offs or communication delays.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Examine the top metric cards for Total Pipeline Value, Active Leads, Conversion Rate, and Avg Response Time.',
            detail: 'Green badges indicate positive growth trends compared to the previous 30-day billing cycle.',
          },
          {
            stepNumber: 2,
            instruction: 'Inspect the "Speed-to-Lead Response Velocity" gauge.',
            detail: 'If the average response time exceeds 60 seconds, investigate the Lead Ingestion routing rules or AI ISA auto-responder toggle.',
          },
          {
            stepNumber: 3,
            instruction: 'Analyze the "Lead Sources & Conversion" breakdown chart.',
            detail: 'Hover over individual bars (Meta Ads, Zillow, Google, WhatsApp) to see cost-per-qualified-lead ratios.',
          },
        ],
        expectedResult: 'You will have a clear diagnostic of which lead generation channels yield the highest ROI and whether response SLAs are being met.',
      },
      {
        id: 'dash-quick-dial',
        title: 'How to Launch a Quick Action Directly from the Dashboard',
        description: 'Trigger immediate lead outreach or dialer sessions without navigating away.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Locate the "Quick Actions" panel on the right side of the dashboard.',
            detail: 'Contains shortcuts for "Launch Parallel Dialer", "Send Broadcast SMS", and "Run Data Clean".',
          },
          {
            stepNumber: 2,
            instruction: 'Click "Launch Parallel Dialer" to immediately open the telephony queue with top-priority contacts.',
          },
          {
            stepNumber: 3,
            instruction: 'Review the live activity stream on the bottom-left to observe recent inbound leads and AI ISA chat transcripts.',
          },
        ],
        expectedResult: 'The respective action modal will open instantly without losing your dashboard state.',
      },
    ],
    workarounds: [
      {
        id: 'dash-stale-metrics',
        issue: 'Metrics or Activity Feed appear delayed or not updating in real time',
        cause: 'WebSocket reconnect timeout or stale browser cache after wake-from-sleep.',
        symptoms: ['Activity feed timestamp is older than 5 minutes', 'New lead just ingested is missing from total count'],
        recommendedWorkaround: {
          title: 'Trigger Instant State Refresh',
          steps: [
            'Click the refresh icon on the top right or navigate to another tab (e.g. Contacts) and return to Dashboard.',
            'Hard reload the browser window (Ctrl + F5 or Cmd + Shift + R).',
            'Verify your internet connectivity and check that no corporate VPN is blocking WebSocket port connections.',
          ],
        },
        alternativeWorkaround: {
          title: 'Direct Navigation to Data Health',
          steps: [
            'Navigate to the Data Health tab in the sidebar.',
            'Click "Run Full Auto-Clean" to force a complete database synchronization and cache refresh.',
          ],
        },
      },
      {
        id: 'dash-missing-lead-source',
        issue: 'Lead shows as "Direct / Unclassified" instead of actual ad campaign source',
        cause: 'Inbound webhook payload was missing UTM parameters or referrer metadata.',
        symptoms: ['Lead Source chart shows high percentage of "Unknown"'],
        recommendedWorkaround: {
          title: 'Map UTM Headers in Lead Ingestion',
          steps: [
            'Navigate to "Lead Ingestion" in the Configuration section of the sidebar.',
            'Click "Webhooks Tab" and choose your active endpoint.',
            'Add fallback field mappings for "utm_source", "campaign_name", and "ad_id".',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Activity Stream Buffer Cap',
        description: 'The live activity feed displays the most recent 100 system events in memory to preserve high UI rendering speeds.',
        impact: 'Older events beyond 100 must be viewed in individual Contact Timelines or the Call History log.',
        remedyRecommendation: 'For full audit trails, use the Contact Detail activity history or the Settings logs.',
      },
      {
        title: 'Analytics Aggregation Interval',
        description: 'Historical trend charts aggregate data hourly during peak traffic periods.',
        impact: 'Intra-hour micro-fluctuations in closed deal values reflect upon transaction state save.',
        remedyRecommendation: 'Use the Pipeline board for immediate minute-by-minute transaction tracking.',
      },
    ],
    proTips: [
      {
        title: 'Morning Power Routine',
        content: 'Review the "Speed-to-Lead" card first thing every morning. If any leads show uncontacted > 15m, click "Launch Parallel Dialer" to sweep them before 9:30 AM.',
      },
      {
        title: 'Customizing Dashboard View',
        content: 'Collapse the sidebar (using the arrow at the bottom of the navigation bar) to expand the chart visualization area on smaller laptop screens.',
      },
    ],
    quickLinks: [
      { label: 'View Pipeline Deals', to: '/pipeline' },
      { label: 'Launch Parallel Dialer', to: '/dialer' },
      { label: 'Open Omnichannel Inbox', to: '/inbox' },
    ],
  },
  {
    id: 'inbox',
    title: 'Omnichannel Unified Inbox & AI Copilot',
    subtitle: 'Single-thread multi-channel messaging (SMS, WhatsApp, Email, Voice) with 1-tap AI takeover',
    category: 'Communications',
    routePatterns: ['/inbox'],
    overview:
      'The Omnichannel Inbox consolidates all inbound and outbound client interactions into a unified conversational timeline. You can seamlessly switch between 2-Way SMS, official WhatsApp Business Cloud API, Rich HTML Email, and Voice Call Recordings while collaborating with the AI ISA Copilot.',
    capabilities: [
      {
        title: 'Multi-Channel Channel Switching',
        description: 'Switch between SMS, WhatsApp Cloud API, and Email in the same thread without losing conversational context.',
        specMetric: 'Instant channel switching',
      },
      {
        title: 'Human-in-the-Loop AI ISA Takeover',
        description: 'Seamlessly pause autonomous AI auto-responses with 1 click when a human agent is ready to step in.',
        specMetric: '1-tap override',
      },
      {
        title: 'WhatsApp Business Cloud Integration',
        description: 'Official Meta Cloud API support with verified business messaging, rich media, and 24h conversation windows.',
        specMetric: 'Meta verified API',
      },
      {
        title: 'Rich Canned Response Snippets',
        description: 'Pre-written templates for showing confirmations, CMA delivery, mortgage pre-approval requests, and price reductions.',
        specMetric: 'Instant macro dispatch',
      },
    ],
    stepByStepTasks: [
      {
        id: 'inbox-human-takeover',
        title: 'How to Take Over an AI ISA Conversation (Human-in-the-Loop)',
        description: 'Gracefully pause the AI ISA when a qualified lead asks a highly specific question.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Select the conversation from the left conversation list.',
            detail: 'Conversations with an active AI ISA session show a glowing purple "AI Active" badge.',
          },
          {
            stepNumber: 2,
            instruction: 'Locate the "AI Copilot / Status" toggle banner at the top of the chat window.',
          },
          {
            stepNumber: 3,
            instruction: 'Click "Take Over (Pause AI)" to switch the conversation into Manual Agent Mode.',
            detail: 'This stops automated AI follow-ups so you can converse freely without overlapping.',
          },
          {
            stepNumber: 4,
            instruction: 'Type your message in the composer below and press Send (or Enter).',
          },
          {
            stepNumber: 5,
            instruction: 'When finished, click "Resume AI ISA" if you wish the bot to resume automated qualification drip nurturing.',
          },
        ],
        expectedResult: 'The AI will yield full control to the agent, preventing double messaging or confusing AI responses.',
      },
      {
        id: 'inbox-whatsapp-send',
        title: 'How to Send a WhatsApp Message or Canned Template',
        description: 'Communicate with high-net-worth or international clients via WhatsApp Business.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'In the chat composer bottom bar, click the channel selector button and choose "WhatsApp".',
          },
          {
            stepNumber: 2,
            instruction: 'Check the 24-hour customer service window status indicator.',
            detail: 'If the client messaged you within 24 hours, freeform text is enabled. If expired, select an approved HSM Template.',
          },
          {
            stepNumber: 3,
            instruction: 'Click the "Templates" icon to pick a pre-approved message (e.g. "Property Showing Confirmation").',
          },
          {
            stepNumber: 4,
            instruction: 'Review the variable fields (e.g. [Contact Name], [Property Address]) and click "Send via WhatsApp".',
          },
        ],
        expectedResult: 'The message is delivered directly through WhatsApp Business Cloud API with real-time read receipts (double blue checkmarks).',
      },
    ],
    workarounds: [
      {
        id: 'inbox-whatsapp-24h-block',
        issue: 'WhatsApp message fails with "24-Hour Session Window Expired" error',
        cause: 'Meta WhatsApp Business Cloud API policy requires pre-approved template messages (HSMs) for outbound messages sent >24h after the user\'s last message.',
        symptoms: ['Error toast: "Outbound session closed"', 'Message has a red exclamation point'],
        recommendedWorkaround: {
          title: 'Use Approved WhatsApp HSM Template',
          steps: [
            'Click the "Templates" dropdown above the message composer.',
            'Choose an approved template such as "Listing Alert Update" or "Schedule Follow-up".',
            'Ensure all variable placeholders are populated, then click Send.',
          ],
        },
        alternativeWorkaround: {
          title: 'Switch Channel to SMS or Email',
          steps: [
            'Click the Channel Selector in the composer and switch from "WhatsApp" to "SMS".',
            'Send your message as a standard 10DLC compliant SMS text message.',
          ],
        },
      },
      {
        id: 'inbox-sms-undelivered',
        issue: 'SMS delivery fails or is rejected by carrier',
        cause: 'Contact phone number may be a landline or registered on the National DNC Registry, or 10DLC brand registration is pending.',
        symptoms: ['Message shows "Undelivered"', 'Contact profile shows unverified carrier badge'],
        recommendedWorkaround: {
          title: 'Verify Line Type in Contact Pane',
          steps: [
            'Check the right-hand Contact Info Pane in the inbox.',
            'If the phone shows "Landline", click the "Email" tab and send an email instead.',
            'If the phone is unverified, open "Data Health" and click "Verify Phone Numbers".',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Meta WhatsApp 24-Hour Window',
        description: 'Meta strictly enforces a 24-hour customer care window for non-template marketing messages.',
        impact: 'Free-form open text messaging cannot be initiated after 24 hours of client silence without using a pre-approved template.',
        remedyRecommendation: 'Use verified HSM templates or trigger an SMS message to prompt the user to reply on WhatsApp.',
      },
      {
        title: 'MMS File Attachment Size Cap',
        description: 'Carrier networks restrict cellular MMS image/video attachments to 5MB (SMS) and 16MB (WhatsApp).',
        impact: 'High-resolution PDF brochures or 4K video walk-throughs over 16MB cannot be sent as raw attachments.',
        remedyRecommendation: 'Use PropPulse digital micro-CMA or cloud landing page links instead of large raw video files.',
      },
    ],
    proTips: [
      {
        title: 'Keyboard Fast-Send',
        content: 'Press "Ctrl + Enter" (or "Cmd + Enter") to instantly send your message and advance to the next unread conversation in your queue.',
      },
      {
        title: 'Instant Contact Record Jump',
        content: 'Click the contact name in the top header of the chat window to open their full Contact Dossier with comprehensive property notes.',
      },
    ],
    quickLinks: [
      { label: 'View All Contacts', to: '/contacts' },
      { label: 'AI ISA Configuration', to: '/ai-isa' },
      { label: 'Check Data Health', to: '/data-health' },
    ],
  },
  {
    id: 'dialer',
    title: 'Multi-Line WebRTC Parallel Power Dialer',
    subtitle: 'Dial 1, 3, or 5 leads simultaneously with zero telemarketer delay, local presence, and 1-click voicemail drop',
    category: 'Telephony',
    routePatterns: ['/dialer'],
    overview:
      'The PropPulse Parallel Dialer connects directly via WebRTC SIP trunking to power through calling queues 400% faster than manual single-line dialing. When a human answers, remaining lines are instantly disconnected in under 50ms with zero awkward delay.',
    capabilities: [
      {
        title: '1, 3, or 5 Parallel Lines Concurrency',
        description: 'Simultaneously dial up to 5 contacts. When a lead picks up, other lines drop seamlessly and the lead dossier pops.',
        specMetric: '<50ms pick-up connect latency',
      },
      {
        title: 'Dynamic Local Presence Caller ID',
        description: 'Automatically selects an outbound caller ID with the same local area code as the prospect to double answer rates.',
        specMetric: '42%+ answer rate boost',
      },
      {
        title: '1-Click Voicemail Drop',
        description: 'Leave pre-recorded studio-grade voicemails with a single tap while immediately moving on to the next live conversation.',
        specMetric: 'Instant queue progression',
      },
      {
        title: 'Live Call Recording & AI Transcription',
        description: 'Automated dual-channel recording and instant speech-to-text transcription with sentiment and intent extraction.',
        specMetric: 'Real-time AI summary',
      },
    ],
    stepByStepTasks: [
      {
        id: 'dialer-launch-3line',
        title: 'How to Launch a 3-Line Parallel Dialing Session',
        description: 'Start calling your highest-priority leads in parallel.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Ensure your computer headset / microphone is plugged in and browser audio permissions are granted.',
          },
          {
            stepNumber: 2,
            instruction: 'Click the "Launch 3-Line Parallel" button in the top banner (or "Start Dialing Queue").',
            detail: 'This opens the full-screen Parallel Dialer modal with 3 live visual line monitors.',
          },
          {
            stepNumber: 3,
            instruction: 'Click "Start Dialing Session" inside the modal.',
            detail: 'The system initiates 3 simultaneous WebRTC calls. Live ringback and carrier status will appear on each line tile.',
          },
          {
            stepNumber: 4,
            instruction: 'When a prospect answers, Line 1/2/3 turns green ("CONNECTED") and their full Dossier & Script opens.',
          },
          {
            stepNumber: 5,
            instruction: 'Conduct your conversation. If you reach a voicemail, click "Drop Voicemail" to leave your pre-recorded audio.',
          },
          {
            stepNumber: 6,
            instruction: 'Log your disposition (e.g. "Interested - Follow Up", "Not Interested", "Wrong Number") and click "Next Call".',
          },
        ],
        expectedResult: 'The dialer cycles through leads with zero telemarketer delay and automatically updates contact activity logs.',
      },
      {
        id: 'dialer-record-voicemail',
        title: 'How to Pre-Record and Select Voicemail Drops',
        description: 'Set up customized pre-recorded audio for instant 1-click voicemail drops.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Dialer Settings & Voicemails" tab on the Dialer page.',
          },
          {
            stepNumber: 2,
            instruction: 'In the "Voicemail Drops" section, click "Upload / Record New Voicemail".',
          },
          {
            stepNumber: 3,
            instruction: 'Record a 20-30 second clear message (e.g. "Hi, this is [Name] regarding your recent inquiry on [Address]...").',
          },
          {
            stepNumber: 4,
            instruction: 'Set your primary audio as the default drop audio.',
          },
        ],
        expectedResult: 'When answering machines are detected, clicking "Drop Voicemail" plays this recording cleanly without you having to repeat it.',
      },
    ],
    workarounds: [
      {
        id: 'dialer-webrtc-audio-blocked',
        issue: 'Dialer fails to start or shows "Microphone Access Denied / WebRTC Error"',
        cause: 'Browser permissions blocked microphone access or default input device is disconnected.',
        symptoms: ['Dial button is disabled or modal shows red warning banner', 'No audio heard on line connect'],
        recommendedWorkaround: {
          title: 'Grant Browser Microphone Permission',
          steps: [
            'Click the padlock / tune icon in your browser URL address bar (left of the website address).',
            'Locate "Microphone" and change the setting to "Allow".',
            'Refresh the page and reopen the Parallel Dialer modal.',
            'Ensure your operating system sound settings have the correct microphone selected as default.',
          ],
        },
        alternativeWorkaround: {
          title: 'Fallback to 1-Line Standard or Softphone',
          steps: [
            'Use the "1-Line Standard" mode which operates with lower audio bandwidth requirements.',
            'Or click the phone number in the contact dossier to initiate a direct SIP call through your desktop softphone.',
          ],
        },
      },
      {
        id: 'dialer-call-drops-immediately',
        issue: 'Outbound calls disconnect after 1-2 rings',
        cause: 'Prospect number is registered on state DNC registry or carrier flagged caller ID reputation.',
        symptoms: ['Line status displays "DNC Blocked" or "Carrier Rejected"'],
        recommendedWorkaround: {
          title: 'Verify DNC Scrub and Local Presence Numbers',
          steps: [
            'Open "Data Health" in the sidebar to review the DNC compliance status.',
            'In Dialer Settings, enable "Dynamic Local Presence" to rotate outbound Caller IDs across clean verified numbers.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Maximum 5 Parallel Lines Concurrency',
        description: 'The parallel engine allows a maximum of 5 concurrent lines per active agent seat to prevent TCPA call abandonment penalties.',
        impact: 'Cannot initiate more than 5 simultaneous outbound rings on a single agent workstation.',
        remedyRecommendation: '5-line dialing achieves 80-120 dials per hour, which is the optimal human-handling threshold.',
      },
      {
        title: 'TCPA Calling Time Windows',
        description: 'Federal and State TCPA regulations prohibit cold automated telemarketing outside of 8:00 AM to 9:00 PM recipient local time.',
        impact: 'Dialer will prevent launching queues to time zones currently outside legal calling hours.',
        remedyRecommendation: 'Queue contacts by time zone in Smart Lists before launching morning or evening dialing sessions.',
      },
    ],
    proTips: [
      {
        title: 'Use 3-Line as the Sweet Spot',
        content: '3-Line Parallel dialing offers the highest contact-to-conversation ratio without risking simultaneous double-pickups.',
      },
      {
        title: 'Mini Dialer Bar Floating Mode',
        content: 'Click the minimize icon on the dialer modal to collapse the dialer into the bottom Mini Dialer Bar while browsing contact dossiers.',
      },
    ],
    quickLinks: [
      { label: 'Open Smart Lists Queue', to: '/smart-lists' },
      { label: 'Check Lead Ingestion', to: '/lead-ingestion' },
      { label: 'Review Telephony Settings', to: '/settings' },
    ],
  },
  {
    id: 'ai-isa',
    title: 'Sub-30s Omnichannel AI ISA Engine',
    subtitle: 'Autonomous lead qualification across Voice AI, WhatsApp, SMS & Email with custom qualification criteria',
    category: 'AI Intelligence',
    routePatterns: ['/ai-isa'],
    overview:
      'The AI ISA Engine qualifies inbound leads within 30 seconds of form submission across conversational Voice AI (<600ms latency), WhatsApp, SMS, and Email. It evaluates budget, timeline, pre-approval status, and existing home trade-in before transferring hot leads to live agents.',
    capabilities: [
      {
        title: 'Sub-600ms Conversational Voice AI',
        description: 'Ultra-low latency human-like voice conversations capable of handling interruptions and complex objections.',
        specMetric: '<600ms streaming latency',
      },
      {
        title: 'Customizable Qualification Directives',
        description: 'Configure rules for minimum budget, purchase timeframe, mortgage pre-approval, and home-to-sell status.',
        specMetric: 'Dynamic scoring rules',
      },
      {
        title: '90+ Day Database Reactivation Campaigns',
        description: 'Autonomous campaigns that re-engage dormant contacts with hyper-personalized local market updates.',
        specMetric: '7-10% reactivation rate',
      },
      {
        title: 'Interactive Live AI Sandbox',
        description: 'Test prompts, objection handling, and persona tone in real-time before deploying to live leads.',
        specMetric: 'Real-time test simulation',
      },
    ],
    stepByStepTasks: [
      {
        id: 'ai-test-sandbox',
        title: 'How to Test & Audit AI Persona Responses in the Live Sandbox',
        description: 'Simulate lead inquiries to test the AI ISA’s qualification logic.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'On the AI ISA Engine page, select the "Live AI Sandbox" tab.',
          },
          {
            stepNumber: 2,
            instruction: 'Select a persona preset (e.g. "Sarah - Luxury Buyer Specialist" or "Alex - Aggressive Inbound Qualifier").',
          },
          {
            stepNumber: 3,
            instruction: 'Type a sample buyer message (e.g. "Hi, I want to see the house on 742 Evergreen Terrace this weekend. My budget is $850k.")',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Simulate AI Response" and observe the generated reply, detected qualification points, and intent score.',
          },
          {
            stepNumber: 5,
            instruction: 'Verify that the AI successfully extracted budget ($850k), timeline (this weekend), and asked for financing status.',
          },
        ],
        expectedResult: 'You can verify exactly how the AI will converse with real clients before turning on automated outreach.',
      },
      {
        id: 'ai-configure-criteria',
        title: 'How to Customize Lead Qualification Criteria Directives',
        description: 'Define the parameters a lead must satisfy to be flagged as "Hot / Transfer-Ready".',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Qualification Directives" tab.',
          },
          {
            stepNumber: 2,
            instruction: 'Toggle qualification fields on/off: Minimum Budget, Timeline (<90 days), Mortgage Pre-Approval, and Property to Sell.',
          },
          {
            stepNumber: 3,
            instruction: 'Adjust the importance weight slider (1x to 3x) for each directive.',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Save Qualification Directives" in the top right.',
          },
        ],
        expectedResult: 'Inbound leads will now be evaluated against these strict rules before triggering agent notifications.',
      },
      {
        id: 'ai-launch-reactivation',
        title: 'How to Launch a Database Reactivation Drip on Dormant Leads',
        description: 'Wake up old, inactive leads that have been sitting in your database for 90+ days.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Database Reactivation" tab.',
          },
          {
            stepNumber: 2,
            instruction: 'Review the available campaign presets (e.g. "90-Day Cold Buyer Market Shift", "High Equity Homeowner Equity Check").',
          },
          {
            stepNumber: 3,
            instruction: 'Select the communication channel (SMS, WhatsApp, or Voice AI).',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Activate Campaign" to begin automated background nurturing.',
          },
        ],
        expectedResult: 'PropPulse OS will reach out in controlled batches, generating fresh live responses in your Inbox.',
      },
    ],
    workarounds: [
      {
        id: 'ai-misinterpreting-lead',
        issue: 'AI ISA misinterprets lead intent or asks repetitive questions',
        cause: 'Lead provided non-standard phrasing or sent an image/audio message without text transcript.',
        symptoms: ['AI repeats question or qualifies lead with wrong criteria'],
        recommendedWorkaround: {
          title: 'Fine-Tune System Prompt or Take Over in Inbox',
          steps: [
            'Navigate to Settings > Integrations & AI Models and increase the temperature or provide explicit negative constraints.',
            'Open the conversation in the Inbox and click "Take Over (Pause AI)" to continue manually.',
          ],
        },
      },
      {
        id: 'ai-rate-limit-hit',
        issue: 'AI auto-responses paused or throttled during heavy ad traffic',
        cause: 'OpenAI API rate limit or Twilio SMS 10DLC throughput limit reached.',
        symptoms: ['Speed to lead badge increases above 60s', 'Status indicator shows "API Queue Throttled"'],
        recommendedWorkaround: {
          title: 'Enable Fallback Model & High-Throughput Routing',
          steps: [
            'In Settings > Integrations, ensure a secondary backup model (Claude 3.5 Sonnet / GPT-4o-mini) is configured.',
            'In Lead Ingestion, enable "Time-of-Day Escalation" to route overflow leads directly to human agents on duty.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Reactivation Batch Rate Limit',
        description: 'Dormant lead reactivation campaigns are limited to 500 contacts per hour per phone number.',
        impact: 'A list of 5,000 old leads will take approximately 10 hours to complete outreach.',
        remedyRecommendation: 'This protects your phone numbers from spam reputation blacklists and carrier 10DLC penalties.',
      },
      {
        title: 'Voice AI Concurrent Channel Limit',
        description: 'Simultaneous outbound conversational voice AI calls depend on your telephony trunking tier.',
        impact: 'Spike volumes above 20 concurrent inbound voice calls queue leads for 15-30 seconds.',
        remedyRecommendation: 'Configure SMS instant auto-reply as the primary immediate fallback for overflow volume.',
      },
    ],
    proTips: [
      {
        title: 'Use Short Open-Ended Prompts',
        content: 'AI ISAs get 300% more replies when asking questions like "Are you looking to buy this spring or just browsing the market?" rather than long corporate essays.',
      },
      {
        title: 'Monitor Speed & Latency KPIs',
        content: 'Keep an eye on the "Speed & Latency KPIs" tab to make sure your 99th percentile response time stays below 30 seconds.',
      },
    ],
    quickLinks: [
      { label: 'Test Live AI Sandbox', to: '/ai-isa' },
      { label: 'Check Inbox Conversations', to: '/inbox' },
      { label: 'Configure API Keys', to: '/settings' },
    ],
  },
  {
    id: 'contacts',
    title: 'Contacts Directory & Client Dossiers',
    subtitle: 'Comprehensive contact management, carrier line-type verification, DNC scrubbing, and instant Micro-CMA',
    category: 'Sales Pipeline',
    routePatterns: ['/contacts'],
    overview:
      'The Contacts module provides a 360-degree client dossier. It tracks complete interaction history, lead scoring, carrier line verification (Mobile vs Landline), DNC compliance status, notes, tasks, and predictive seller equity scores.',
    capabilities: [
      {
        title: '360-Degree Contact Dossier',
        description: 'Consolidated view of communications, property interests, lead scores, deal stages, and carrier verification status.',
        specMetric: 'Unified timeline view',
      },
      {
        title: 'Carrier Line Type & DNC Badging',
        description: 'Instant visual indicators showing whether a number is Mobile, Landline, or VOIP, and whether it is DNC clean.',
        specMetric: 'Automated verification',
      },
      {
        title: 'Automated 1-Click Micro-CMA Generation',
        description: 'Generate interactive digital property valuation landing pages with recent neighborhood comps in 2 seconds.',
        specMetric: 'Instant CMA landing page',
      },
      {
        title: 'CSV Import with Smart Auto-Mapping',
        description: 'Import up to 50,000 records from Follow Up Boss, kvCORE, Lofty, or custom spreadsheets with auto-header matching.',
        specMetric: 'Sub-10s parsing',
      },
    ],
    stepByStepTasks: [
      {
        id: 'contacts-search-filter',
        title: 'How to Search, Filter, and Segment Contacts',
        description: 'Find contacts by stage, score, tags, or property search criteria.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Use the top search bar to search by name, email, phone number, or street address.',
          },
          {
            stepNumber: 2,
            instruction: 'Click the "Filter" button to refine by Lead Stage, Lead Source, or Min Lead Score.',
          },
          {
            stepNumber: 3,
            instruction: 'Click on any contact row to open their full interactive Dossier view.',
          },
        ],
        expectedResult: 'Matched contacts appear instantly in the table with their lead score and phone type badges.',
      },
      {
        id: 'contacts-trigger-cma',
        title: 'How to Trigger an Automated Micro-CMA Valuation for a Homeowner',
        description: 'Dispatch a personalized equity valuation report to a potential seller.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Open the contact\'s dossier by clicking their name.',
          },
          {
            stepNumber: 2,
            instruction: 'In the right-hand panel, locate the "Seller Radar & Micro-CMA" section.',
          },
          {
            stepNumber: 3,
            instruction: 'Click "Generate Micro-CMA Landing Page".',
            detail: 'PropPulse OS pulls recent MLS/public record comps and computes estimated equity.',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Send via SMS / WhatsApp" to dispatch the interactive link to the homeowner.',
          },
        ],
        expectedResult: 'A trackable digital valuation page is generated and sent; when the client opens it, you receive an instant alert.',
      },
      {
        id: 'contacts-import-csv',
        title: 'How to Import Contacts from a CSV File',
        description: 'Migrate contact databases from other CRMs without losing notes or tags.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click "Import Contacts" on the top right of the Contacts page.',
          },
          {
            stepNumber: 2,
            instruction: 'Drag and drop your .csv file into the upload zone.',
          },
          {
            stepNumber: 3,
            instruction: 'Review the column mapping preview (First Name, Last Name, Phone, Email, Tags, Source).',
          },
          {
            stepNumber: 4,
            instruction: 'Select duplicate handling preference (e.g. "Merge with existing records if email/phone matches").',
          },
          {
            stepNumber: 5,
            instruction: 'Click "Start Import".',
          },
        ],
        expectedResult: 'Contacts are imported and automatically queued for background carrier lookup and deduplication check.',
      },
    ],
    workarounds: [
      {
        id: 'contacts-csv-mapping-mismatch',
        issue: 'CSV Import fails or imports fields into wrong columns',
        cause: 'Source file had custom or non-standard header column names.',
        symptoms: ['Phone numbers appear in notes field or names are blank'],
        recommendedWorkaround: {
          title: 'Manual Column Re-Mapping',
          steps: [
            'In the Import dialog preview step, click the dropdown next to each column header and manually select the appropriate PropPulse field.',
            'Or download our standard template CSV, paste your data into the corresponding columns, and re-upload.',
          ],
        },
      },
      {
        id: 'contacts-dnc-override',
        issue: 'Cannot send SMS or start call because contact has "DNC Active" badge',
        cause: 'Phone number matched the National or State Do-Not-Call registry.',
        symptoms: ['Call button and SMS send buttons are disabled with a security shield icon'],
        recommendedWorkaround: {
          title: 'Document Written Consent for TCPA Exemption',
          steps: [
            'If the client explicitly gave written opt-in consent (e.g. via website form submission within 90 days), open their Dossier.',
            'Click "Compliance & DNC Status" > "Log Written Opt-In Consent" and attach the form confirmation.',
            'This unlocks communication while recording the compliance audit trail.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Single CSV File Size Limit',
        description: 'Single upload batches are capped at 50,000 rows or 25MB per file.',
        impact: 'Databases larger than 50k rows must be split into multiple CSV files.',
        remedyRecommendation: 'Split files by lead stage or year of creation before importing.',
      },
      {
        title: 'Permanent Record Deletion',
        description: 'Deleting a contact permanently purges all call recordings, SMS threads, and notes from the database.',
        impact: 'Deleted contacts cannot be recovered.',
        remedyRecommendation: 'Use the "Archive" or "Trash" stage rather than hard deleting if you may need historical activity records.',
      },
    ],
    proTips: [
      {
        title: 'Quick Call Directly from Table',
        content: 'Hover over any row in the Contacts table and click the Phone icon on the far right to launch an instant single-line call.',
      },
      {
        title: 'Tag-Based Segmentation',
        content: 'Use consistent tags like "Seller-HighEquity", "PreApproved-$700k", or "FirstTimeBuyer" to power dynamic Smart Lists.',
      },
    ],
    quickLinks: [
      { label: 'Create Smart List', to: '/smart-lists' },
      { label: 'Check Data Quality', to: '/data-health' },
      { label: 'View Pipeline Deals', to: '/pipeline' },
    ],
  },
  {
    id: 'pipeline',
    title: 'Kanban Sales Pipeline & Closing Engine',
    subtitle: 'Visual deal management, transaction closing checklists, native eSignatures, and commission split calculators',
    category: 'Sales Pipeline',
    routePatterns: ['/pipeline'],
    overview:
      'The Pipeline board bridges front-office lead nurture to back-office transaction execution. Track deals across stages (Lead, Contacted, Qualified, Showing, Under Contract, Closed), generate closing checklists, trigger eSignatures, and compute agent commission splits.',
    capabilities: [
      {
        title: 'Drag-and-Drop Kanban Stages',
        description: 'Move deals smoothly across stages with optimistic UI updates and instant activity logging.',
        specMetric: '60fps drag performance',
      },
      {
        title: 'Automated Commission Split Calculator',
        description: 'Computes agent splits, brokerage splits, franchise royalty fees, and coordinator deductions based on capping models.',
        specMetric: 'Dynamic capping calculations',
      },
      {
        title: 'Transaction Closing Checklist',
        description: 'Automated checklist generator for earnest money deposits, home inspections, appraisals, and title clearance.',
        specMetric: 'Milestone tracking',
      },
      {
        title: 'Deal Value & Weighted Forecasts',
        description: 'Computes expected revenue based on deal stage probability (e.g. 10% on Lead, 90% on Under Contract).',
        specMetric: 'Real-time revenue forecast',
      },
    ],
    stepByStepTasks: [
      {
        id: 'pipe-move-deal',
        title: 'How to Move Deals and Update Transaction Stages',
        description: 'Progress deals through your sales funnel.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Locate the deal card in its current column (e.g. "Showing / Active").',
          },
          {
            stepNumber: 2,
            instruction: 'Click and hold the card, then drag it into the new target stage column (e.g. "Under Contract").',
            detail: 'Alternatively, click the deal card to open the Deal Detail Drawer and change the stage dropdown.',
          },
          {
            stepNumber: 3,
            instruction: 'If moving to "Under Contract", confirm the agreed Contract Price, Close Date, and Title Company.',
          },
        ],
        expectedResult: 'The deal is moved, pipeline summary totals recalculate, and the transaction closing checklist is auto-generated.',
      },
      {
        id: 'pipe-calc-commissions',
        title: 'How to Calculate Commission Splits & Brokerage Net',
        description: 'Determine exact payout amounts for agents, teams, and brokerages.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click on any deal card to open the Deal Detail Drawer.',
          },
          {
            stepNumber: 2,
            instruction: 'Click "Calculate Commission Splits" at the bottom of the drawer.',
            detail: 'This opens the Commission Calculator Modal.',
          },
          {
            stepNumber: 3,
            instruction: 'Enter the Sale Price (e.g. $650,000) and Total Commission Rate (e.g. 3.0%).',
          },
          {
            stepNumber: 4,
            instruction: 'Select the Agent Split Plan (e.g. "80/20 Tier with $18,000 Cap").',
          },
          {
            stepNumber: 5,
            instruction: 'Review the breakdown: Gross Commission, Agent Net, Brokerage Cut, and TC Fee.',
          },
          {
            stepNumber: 6,
            instruction: 'Click "Save Payout Breakdown" to attach this calculation to the transaction record.',
          },
        ],
        expectedResult: 'Payout amounts are stored and ready for accounting sync or 1099 statement generation.',
      },
    ],
    workarounds: [
      {
        id: 'pipe-drag-drop-freeze',
        issue: 'Drag-and-drop does not drop deal card into target column on touch/mobile devices',
        cause: 'Pointer event conflict on high-DPI touch screens or hybrid laptop trackpads.',
        symptoms: ['Card snaps back to original column when dropped'],
        recommendedWorkaround: {
          title: 'Use 1-Click Stage Picker in Deal Drawer',
          steps: [
            'Click directly on the deal card title to open the Deal Detail Drawer.',
            'Use the "Stage" dropdown at the top to select your desired stage.',
            'Click "Save Changes".',
          ],
        },
      },
      {
        id: 'pipe-split-calc-discrepancy',
        issue: 'Commission calculator displays incorrect split percentage',
        cause: 'Agent capping threshold was reached or custom team referral fee was not enabled in settings.',
        symptoms: ['Brokerage cut is higher or lower than expected'],
        recommendedWorkaround: {
          title: 'Update Commission Plan in Settings',
          steps: [
            'Navigate to Settings > Team Management.',
            'Select the agent and verify their "Commission Plan & Annual Cap Progress".',
            'Update the tier or reset the annual cap date if a new calendar year has started.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Maximum 10 Active Pipeline Stages',
        description: 'To maintain horizontal readability and fast rendering, the pipeline board supports up to 10 active stage columns.',
        impact: 'Extremely granular sub-steps should be tracked within transaction checklists rather than separate board columns.',
        remedyRecommendation: 'Use the Deal Detail Checklist to track micro-milestones (e.g. Termite Inspection, Loan Commitment).',
      },
      {
        title: 'Multi-Currency Conversion Rate',
        description: 'For international brokerages (UAE Dirhams, Euros, GBP), currency conversions use the daily fixed ECB rate.',
        impact: 'Live cryptocurrency or micro-fluctuations during the day are not real-time updated until midnight UTC.',
        remedyRecommendation: 'Set primary reporting currency in Settings > Global Markets.',
      },
    ],
    proTips: [
      {
        title: 'Deal Color Coding',
        content: 'Deals with high probability or expiring contingency dates are automatically highlighted with accent border rings.',
      },
      {
        title: 'Filter Pipeline by Agent',
        content: 'Team leaders can filter the pipeline to view individual agent pipelines or total brokerage deal flow.',
      },
    ],
    quickLinks: [
      { label: 'View Contact Details', to: '/contacts' },
      { label: 'Check Dashboard Overview', to: '/dashboard' },
      { label: 'Configure Commission Tiers', to: '/settings' },
    ],
  },
  {
    id: 'smart-lists',
    title: 'Smart Lists & Predictive "Seller Radar"',
    subtitle: 'Dynamic lead query engine, 1-click 3-line dialer sync, and AI property equity probability',
    category: 'Sales Pipeline',
    routePatterns: ['/smart-lists'],
    overview:
      'Smart Lists provide dynamic, real-time segmentation of your contact database. Build multi-criteria filter rules (e.g. Lead Score > 75 AND Source = Zillow) and push matches directly into the 3-Line Parallel Dialer in a single click. The predictive Seller Radar flags homeowners with high likelihood of selling in the next 6-12 months based on equity and tenure.',
    capabilities: [
      {
        title: 'Dynamic Multi-Rule Query Engine',
        description: 'Create compound filter rules using field operators (greater than, equals, contains) with instant live recalculation.',
        specMetric: 'Instant client-side filtering',
      },
      {
        title: '1-Click Push to 3-Line Parallel Dialer',
        description: 'Queue the filtered smart list directly into the Parallel Dialer with 1 click to power through calls.',
        specMetric: 'Instant queue injection',
      },
      {
        title: 'Predictive "Seller Radar" Equity Scanner',
        description: 'Analyzes mortgage age, equity percentage, neighborhood turnover velocity, and life events to score seller propensity.',
        specMetric: 'Proprietary AI propensity index',
      },
      {
        title: 'Saved List Presets',
        description: 'Save frequently used segments (e.g. "Hot Leads Ready to Close", "90+ Day Dormant", "High Equity Sellers").',
        specMetric: 'Persistent team presets',
      },
    ],
    stepByStepTasks: [
      {
        id: 'smart-create-filter',
        title: 'How to Build and Save a Dynamic Smart List',
        description: 'Create custom segmented views of your leads.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'On the Smart Lists page, locate the "Filter Rules" builder in the center.',
          },
          {
            stepNumber: 2,
            instruction: 'Select a Field (e.g. "Lead Score"), Operator (e.g. "is greater than"), and enter a Value (e.g. "70").',
          },
          {
            stepNumber: 3,
            instruction: 'Click "+ Add Rule" to add another condition (e.g. Lead Source equals "Zillow").',
          },
          {
            stepNumber: 4,
            instruction: 'Review the "Matched Contacts" table below as it updates automatically.',
          },
          {
            stepNumber: 5,
            instruction: 'Click "Save Rule" on the top right of the builder to name and save your list.',
          },
        ],
        expectedResult: 'The saved list appears in your left sidebar for instant 1-click loading anytime.',
      },
      {
        id: 'smart-push-dialer',
        title: 'How to Push a Smart List into the 3-Line Parallel Dialer',
        description: 'Instantly start calling all leads that meet your smart list filter criteria.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Select your desired Smart List from the left sidebar presets or build your custom filter.',
          },
          {
            stepNumber: 2,
            instruction: 'Verify the count in the "Matched Contacts" badge (e.g. 24 leads).',
          },
          {
            stepNumber: 3,
            instruction: 'Click the primary button "Launch in 3-Line Parallel Dialer".',
          },
          {
            stepNumber: 4,
            instruction: 'The Parallel Dialer modal will open pre-loaded with these exact contacts in priority order.',
          },
        ],
        expectedResult: 'Calling begins across 3 parallel lines with zero manual export or copy-pasting required.',
      },
      {
        id: 'smart-seller-radar',
        title: 'How to Identify High-Propensity Sellers Using "Seller Radar"',
        description: 'Discover existing contacts in your database who are ready to list their property.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Predictive \'Seller Radar\'" tab at the top right of the Smart Lists page.',
          },
          {
            stepNumber: 2,
            instruction: 'Sort the table by "Propensity Score" (Hot: 85%+, Warm: 65-84%).',
          },
          {
            stepNumber: 3,
            instruction: 'Review the "Est. Equity" and "Years Owned" columns.',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Send Micro-CMA" or "Call Seller" on the top candidates.',
          },
        ],
        expectedResult: 'You reach out to listing sellers before they ever interview competing agents.',
      },
    ],
    workarounds: [
      {
        id: 'smart-empty-results',
        issue: 'Smart List shows 0 matched contacts when you know contacts exist',
        cause: 'Conflicting "AND" filter conditions (e.g. Lead Source = "Zillow" AND Lead Source = "Meta").',
        symptoms: ['"No contacts match the current filter rules" placeholder is displayed'],
        recommendedWorkaround: {
          title: 'Simplify Filter Conditions',
          steps: [
            'Remove conflicting filter rules by clicking the trash/remove icon next to the condition.',
            'Ensure numeric values (e.g. Score > 70) do not have non-numeric symbols like "%" or "$".',
            'Test with a single broad filter rule first, then narrow down incrementally.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Public Record Equity Sync Delay',
        description: 'Seller Radar equity calculations rely on county recorder and tax assessor public database feeds updated monthly.',
        impact: 'Refinances or second mortgages closed in the last 14 days may not appear immediately.',
        remedyRecommendation: 'Manually edit the mortgage balance in the Contact Dossier if the client discloses recent refinancing details.',
      },
      {
        title: 'Dialer Queue Ingestion Batch Cap',
        description: 'Pushing a Smart List into the active Parallel Dialer queues up to 250 contacts at a time.',
        impact: 'Lists larger than 250 contacts should be worked in multiple dialing blocks.',
        remedyRecommendation: 'Filter by city or lead score to work high-impact batches of 50-100 leads per calling session.',
      },
    ],
    proTips: [
      {
        title: 'The "Ghost Lead" Reactivation List',
        content: 'Create a Smart List: Status = "Cold" AND Last Activity > 60 days AND Lead Score > 50. Launch in 3-Line dialer every Friday afternoon for quick listing appointments.',
      },
      {
        title: 'Combine Seller Radar with WhatsApp',
        content: 'Contacts flagged with >$250k equity respond 4x better to a concise WhatsApp message with a digital Micro-CMA link than a generic email.',
      },
    ],
    quickLinks: [
      { label: 'Launch Parallel Dialer', to: '/dialer' },
      { label: 'Check All Contacts', to: '/contacts' },
      { label: 'View Self-Healing Clean Data', to: '/data-health' },
    ],
  },
  {
    id: 'data-health',
    title: 'Self-Healing Clean Data Engine',
    subtitle: 'Automated fuzzy deduplication, Twilio carrier line-type verification, MX deliverability check, and DNC compliance scrubbing',
    category: 'Data Quality',
    routePatterns: ['/data-health'],
    overview:
      'Legacy CRMs suffer from 20-30% dirty data decay. PropPulse OS features a background Self-Healing Engine that automatically detects duplicate records, verifies whether phone numbers are Mobile vs Landline, checks recipient inbox MX records to prevent bounces, and screens against DNC registries.',
    capabilities: [
      {
        title: 'Fuzzy Match Deduplication Scanner',
        description: 'Scans names, inverted phone numbers, and email aliases to detect duplicate records with 1-click non-destructive merging.',
        specMetric: 'Fuzzy Levenshtein matching',
      },
      {
        title: 'Twilio / Telesign Carrier Line-Type Lookup',
        description: 'Classifies every phone number as Mobile, Landline, or VOIP to eliminate failed SMS costs and carrier compliance fines.',
        specMetric: 'Real-time carrier lookup',
      },
      {
        title: 'MX & SMTP Deliverability Verification',
        description: 'Pings recipient mail server MX records to flag invalid or disposable email addresses before campaigns are sent.',
        specMetric: '99%+ inbox deliverability',
      },
      {
        title: 'Continuous Cleanliness Grade & Score Gauge',
        description: 'Visual health score (0-100) and letter grade (A+ to F) indicating the hygiene and compliance readiness of your database.',
        specMetric: 'Live database health index',
      },
    ],
    stepByStepTasks: [
      {
        id: 'data-run-autoclean',
        title: 'How to Run a Full Database Auto-Clean Scan',
        description: 'Trigger comprehensive background validation across all contacts.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'On the Data Health page, click the primary button "Run Full Auto-Clean" in the header.',
          },
          {
            stepNumber: 2,
            instruction: 'Observe the scanning indicator as the engine audits duplicates, phone line types, and email deliverability.',
          },
          {
            stepNumber: 3,
            instruction: 'Review the updated "Database Health Score" gauge and stat cards.',
          },
        ],
        expectedResult: 'Potential duplicates, invalid phone numbers, and bounce-prone emails are categorized for 1-click remediation.',
      },
      {
        id: 'data-merge-duplicates',
        title: 'How to Review and Merge Duplicate Contact Records',
        description: 'Consolidate multiple entries for the same person without losing notes or timelines.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Scroll down to the "Potential Duplicates Found" section.',
          },
          {
            stepNumber: 2,
            instruction: 'Compare the candidate cards side-by-side (inspect names, phones, emails, and created dates).',
          },
          {
            stepNumber: 3,
            instruction: 'Click "Merge Records" to unify the duplicate into the master record.',
            detail: 'All communication logs, recordings, and tags from both records are combined seamlessly.',
          },
          {
            stepNumber: 4,
            instruction: 'If the records represent two different people, click "Ignore / Not Duplicate".',
          },
        ],
        expectedResult: 'The database is deduplicated, improving lead routing accuracy and preventing double-messaging.',
      },
    ],
    workarounds: [
      {
        id: 'data-carrier-lookup-quota',
        issue: 'Carrier lookup shows "API Rate Limited / Pending Verification"',
        cause: 'High-volume CSV import exceeded Twilio Lookup concurrent query thresholds.',
        symptoms: ['Phone numbers remain in "Unverified" state after scan'],
        recommendedWorkaround: {
          title: 'Batch Verify Phones in Off-Peak Window',
          steps: [
            'Click the "Verify Phone Numbers" button under Autonomous Healing Routines.',
            'The system will process remaining numbers in rate-regulated background worker batches.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Merged Records Are Irreversible',
        description: 'Merging two contact records combines their activity timelines and sets the primary contact info permanently.',
        impact: 'Once merged, you cannot automatically split the unified record back into two separate entries.',
        remedyRecommendation: 'Always inspect the side-by-side diff preview before confirming the merge action.',
      },
      {
        title: 'VOIP Number SMS Deliverability',
        description: 'Certain VOIP providers (Google Voice, Skype) may block automated shortcode SMS traffic.',
        impact: 'VOIP numbers are flagged with a warning badge and recommend direct voice calling or WhatsApp.',
        remedyRecommendation: 'Use the Parallel Dialer for VOIP numbers rather than automated SMS drip campaigns.',
      },
    ],
    proTips: [
      {
        title: 'Aim for Grade A (90%+)',
        content: 'Databases with a 90%+ health score experience 35% higher SMS response rates and near-zero carrier spam blocking.',
      },
      {
        title: 'Weekly Hygiene Habit',
        content: 'Run a Full Auto-Clean every Monday morning to maintain spotless data hygiene as new leads are ingested throughout the week.',
      },
    ],
    quickLinks: [
      { label: 'View All Contacts', to: '/contacts' },
      { label: 'Check Lead Ingestion Rules', to: '/lead-ingestion' },
      { label: 'Review DNC Settings', to: '/settings' },
    ],
  },
  {
    id: 'lead-ingestion',
    title: 'Intelligent Lead Ingestion & Routing Engine',
    subtitle: 'Universal webhooks, email parsers, weighted distribution rules, and live payload simulator',
    category: 'Automation',
    routePatterns: ['/lead-ingestion'],
    overview:
      'The Lead Ingestion Engine captures inbound leads in real time from Zillow, Realtor.com, Meta Ads, Google Ads, Homes.com, and custom webhooks. It applies customizable routing rules (Round-Robin, Weighted Performance, Territory/Zip-Code Locks, and 60-Second Escalation) before activating the AI ISA.',
    capabilities: [
      {
        title: 'Universal Webhook & REST API Ingestion',
        description: 'Standardized JSON endpoints that accept lead payloads from any marketing landing page or CRM with automatic field normalization.',
        specMetric: '<100ms ingestion latency',
      },
      {
        title: 'Dynamic Weighted & Territory Routing',
        description: 'Route leads by agent performance tiers, closed-deal ratio, zip codes, or round-robin rotation.',
        specMetric: 'Rules-based distribution',
      },
      {
        title: '60-Second Time-of-Day Escalation',
        description: 'If an assigned agent does not claim or answer an inbound hot lead within 60 seconds, the lead re-routes to the backup on-duty agent.',
        specMetric: 'Zero lead decay SLA',
      },
      {
        title: 'Live Interactive Webhook Payload Tester',
        description: 'Simulate inbound payloads from Zillow, Meta, and Realtor.com to verify field mapping and routing rules in real time.',
        specMetric: '1-click payload tester',
      },
    ],
    stepByStepTasks: [
      {
        id: 'leads-copy-webhook',
        title: 'How to Connect a Marketing Webhook (Zillow, Meta, Zapier)',
        description: 'Get your unique webhook URL and connect your ad source.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'On the Lead Ingestion page, click the "Webhooks" tab.',
          },
          {
            stepNumber: 2,
            instruction: 'Copy your unique Ingestion Endpoint URL (e.g. https://api.proppulse.io/v1/webhooks/inbound/...).',
          },
          {
            stepNumber: 3,
            instruction: 'Paste this URL into your Meta Lead Ads Webhook settings, Zapier Webhook trigger, or Zillow Tech Connect.',
          },
          {
            stepNumber: 4,
            instruction: 'Ensure the payload format is set to JSON (POST).',
          },
        ],
        expectedResult: 'Any lead who submits a form will be received by PropPulse OS in under 100 milliseconds.',
      },
      {
        id: 'leads-create-routing-rule',
        title: 'How to Create a Weighted or Territory Routing Rule',
        description: 'Distribute leads automatically based on location or agent performance.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Routing Rules" tab.',
          },
          {
            stepNumber: 2,
            instruction: 'Click "Add Routing Rule" in the top right.',
          },
          {
            stepNumber: 3,
            instruction: 'Name your rule (e.g. "Austin Luxury Zip Codes 78701/78704").',
          },
          {
            stepNumber: 4,
            instruction: 'Select Match Condition (e.g. Zip Code contains "78701, 78704" OR Price > $1,000,000).',
          },
          {
            stepNumber: 5,
            instruction: 'Choose Distribution Strategy (e.g. "Weighted Performance" or "Round-Robin").',
          },
          {
            stepNumber: 6,
            instruction: 'Assign agent weights (e.g. Senior Agent: 70%, Junior Agent: 30%) and click "Save Rule".',
          },
        ],
        expectedResult: 'Incoming matching leads will be assigned according to these exact statistical probabilities.',
      },
      {
        id: 'leads-test-simulator',
        title: 'How to Test Ingestion Using the Live Payload Simulator',
        description: 'Verify your routing configuration before launching live ad spend.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Test Ingestion Simulator" button in the header.',
          },
          {
            stepNumber: 2,
            instruction: 'Select a sample provider payload (e.g. "Zillow Buyer Lead" or "Meta Ad Listing Inquiry").',
          },
          {
            stepNumber: 3,
            instruction: 'Click "Send Test Payload" and inspect the live execution trace.',
          },
          {
            stepNumber: 4,
            instruction: 'Verify that the lead was correctly parsed, scored, and assigned to the intended agent.',
          },
        ],
        expectedResult: 'You receive instant confirmation that your webhook mapping is working with 100% accuracy.',
      },
    ],
    workarounds: [
      {
        id: 'leads-webhook-payload-unparsed',
        issue: 'Inbound webhook received but contact fields are empty or unassigned',
        cause: 'Provider sent custom field names (e.g. "phone_number" instead of "phone" or "cust_email" instead of "email").',
        symptoms: ['Lead appears as "Anonymous" with missing phone/email'],
        recommendedWorkaround: {
          title: 'Add Field Alias Mapping in Webhook Tester',
          steps: [
            'Open "Test Ingestion Simulator" and view the raw received JSON payload.',
            'In Webhooks Tab > Field Mapping, map the provider\'s custom key name to the standard PropPulse field.',
            'Re-test with the simulator to verify successful extraction.',
          ],
        },
      },
      {
        id: 'leads-agent-offline-delay',
        issue: 'Lead sits uncontacted because assigned agent is driving or offline',
        cause: 'Agent did not acknowledge notification within 60 seconds.',
        symptoms: ['Speed to lead metric increases on Dashboard'],
        recommendedWorkaround: {
          title: 'Enable 60-Second Escalation Fallback',
          steps: [
            'Edit the Routing Rule and check "Enable Time-of-Day 60s Escalation".',
            'Select a backup Inside Sales Agent (ISA) or enable "Autonomous AI ISA Instant Outreach".',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Maximum Webhook Payload Size',
        description: 'Inbound HTTP POST webhook payloads are capped at 2MB per request.',
        impact: 'Raw high-res image uploads inside webhooks must be sent as hosted URLs rather than base64 strings.',
        remedyRecommendation: 'Pass image links (S3 / CDN) in the payload instead of raw binary data.',
      },
    ],
    proTips: [
      {
        title: 'Always Test Before Launching Ads',
        content: 'Run a test payload in the simulator whenever you create a new Meta Lead Gen form to ensure zero lead loss from day one.',
      },
      {
        title: 'Territory Lock Efficiency',
        content: 'Locking agents to specific zip codes increases appointment conversion by 40% because agents have immediate local market knowledge.',
      },
    ],
    quickLinks: [
      { label: 'Check AI ISA Settings', to: '/ai-isa' },
      { label: 'View Dashboard KPIs', to: '/dashboard' },
      { label: 'Team Roles & Permissions', to: '/settings' },
    ],
  },
  {
    id: 'settings',
    title: 'System Settings, Team & Regulatory Shield',
    subtitle: 'User profiles, team permissions, commission split capping rules, API integrations, and TCPA/Fair Housing compliance',
    category: 'Administration',
    routePatterns: ['/settings'],
    overview:
      'The Settings module controls your entire organization\'s configuration. Manage team seats and granular role permissions (Admin, Broker, Team Lead, Agent, ISA, TC), configure tiered commission split capping models, manage API keys (Twilio, Meta, OpenAI), and enforce TCPA & Fair Housing NLP compliance guardrails.',
    capabilities: [
      {
        title: 'Granular Role-Based Access Control (RBAC)',
        description: 'Assign distinct roles: Broker, Admin, Team Lead, Agent, Inside Sales Agent (ISA), and Transaction Coordinator (TC).',
        specMetric: 'Strict permission isolation',
      },
      {
        title: 'Tiered Commission Split & Capping Engine',
        description: 'Configure progressive splits (e.g. 70/30 up to $18,000 cap, then 100% to agent) with custom royalty fees and franchise deductions.',
        specMetric: 'Automated cap tracking',
      },
      {
        title: 'Real-Time TCPA & Fair Housing NLP Shield',
        description: 'Pre-send NLP scanning flags prohibited steering terms and demographic bias phrases to protect your brokerage from liability.',
        specMetric: 'Real-time NLP compliance filter',
      },
      {
        title: 'Centralized API & Key Management',
        description: 'Manage Twilio SIP credentials, Meta WhatsApp Cloud tokens, OpenAI/Claude API keys, and MLS RETS/Web API connectors.',
        specMetric: 'Encrypted token storage',
      },
    ],
    stepByStepTasks: [
      {
        id: 'settings-add-team-member',
        title: 'How to Invite Team Members & Assign Role Permissions',
        description: 'Add agents, ISAs, or transaction coordinators to your brokerage account.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Navigate to the "Team Management" tab in Settings.',
          },
          {
            stepNumber: 2,
            instruction: 'Click "Invite Team Member" in the top right.',
          },
          {
            stepNumber: 3,
            instruction: 'Enter First Name, Last Name, Email, and Phone Number.',
          },
          {
            stepNumber: 4,
            instruction: 'Select their Role (e.g. "Agent", "Inside Sales Agent", "Transaction Coordinator").',
          },
          {
            stepNumber: 5,
            instruction: 'Assign their default Commission Plan (e.g. "80/20 with $16k Cap") and click "Send Invitation".',
          },
        ],
        expectedResult: 'The team member receives an onboarding email with secure login credentials and appropriate permission boundaries.',
      },
      {
        id: 'settings-setup-telephony',
        title: 'How to Configure Twilio Telephony & Caller ID Numbers',
        description: 'Connect your VoIP SIP trunking for the Parallel Dialer.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Integrations" tab in Settings.',
          },
          {
            stepNumber: 2,
            instruction: 'Locate the "Twilio Telephony & WebRTC" integration card.',
          },
          {
            stepNumber: 3,
            instruction: 'Enter your Twilio Account SID, Auth Token, and TwiML App SID.',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Test Connection & Verify Trunk".',
          },
          {
            stepNumber: 5,
            instruction: 'Upon green checkmark confirmation, click "Save Telephony Credentials".',
          },
        ],
        expectedResult: 'The Parallel Dialer and WebRTC voice audio will immediately connect to your verified telephony trunk.',
      },
      {
        id: 'settings-fair-housing-nlp',
        title: 'How to Enable Fair Housing NLP Guardrails',
        description: 'Prevent accidental discriminatory language or steering violations in automated messaging.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'Click the "Security & Compliance" tab.',
          },
          {
            stepNumber: 2,
            instruction: 'Toggle "Fair Housing NLP Pre-Send Scanner" to ON.',
          },
          {
            stepNumber: 3,
            instruction: 'Toggle "Strict Do-Not-Call (DNC) Registry Pre-Check" to ON.',
          },
          {
            stepNumber: 4,
            instruction: 'Click "Save Compliance Shield Settings".',
          },
        ],
        expectedResult: 'Any outbound message containing prohibited steering or protected class terms will be blocked with an educational prompt before dispatch.',
      },
    ],
    workarounds: [
      {
        id: 'settings-api-key-rejected',
        issue: 'API Key shows "Connection Failed / Invalid Token"',
        cause: 'Trailing whitespace or incorrect permission scopes on the third-party developer portal.',
        symptoms: ['Test connection button turns red with error code 401'],
        recommendedWorkaround: {
          title: 'Clean Token and Re-Authenticate',
          steps: [
            'Ensure you copied the entire token without leading or trailing spaces.',
            'For OpenAI/Claude, ensure your account has active billing credits.',
            'For WhatsApp Meta API, ensure the System User has "whatsapp_business_messaging" permissions.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Admin/Broker Privilege Restrictions',
        description: 'Only users with the "Broker" or "Admin" role can alter commission capping rules, view full team payout reports, or modify API credentials.',
        impact: 'Standard agent seats cannot access the Security or Integrations configuration tabs.',
        remedyRecommendation: 'Contact your brokerage administrator if you require elevated permissions.',
      },
    ],
    proTips: [
      {
        title: 'Audit User Roles Quarterly',
        content: 'Review the Team Management tab every quarter to deactivate departed agents and reallocate their active leads immediately.',
      },
      {
        title: 'Enable Two-Factor Authentication (2FA)',
        content: 'Enforce mandatory 2FA across all agent seats in the Security tab to comply with NAR and state brokerage data protection standards.',
      },
    ],
    quickLinks: [
      { label: 'View Dashboard', to: '/dashboard' },
      { label: 'Check Lead Ingestion', to: '/lead-ingestion' },
      { label: 'Review Pipeline', to: '/pipeline' },
    ],
  },
  {
    id: 'auth',
    title: 'Authentication & Role Demo Switcher',
    subtitle: 'Secure role-based access, single-click demo persona switcher, and account protection',
    category: 'Access',
    routePatterns: ['/login', '/signup', '/forgot-password'],
    overview:
      'PropPulse OS implements secure JWT-based authentication with role-based dashboard views. Use the 1-Click Demo Persona Switcher to immediately explore the system as an Administrator, Top Producing Agent, Inside Sales Agent (ISA), or Transaction Coordinator.',
    capabilities: [
      {
        title: 'Instant 1-Click Demo Persona Switcher',
        description: 'Test the CRM from the perspective of different team roles (Admin, Agent, ISA, TC) with realistic sample data preloaded.',
        specMetric: 'Instant role switching',
      },
      {
        title: 'Session Persistence & Refresh Tokens',
        description: 'Keeps agents authenticated securely throughout their workday without session timeouts during active calls.',
        specMetric: 'Automatic token renewal',
      },
    ],
    stepByStepTasks: [
      {
        id: 'auth-demo-switch',
        title: 'How to Switch Roles Using the Demo Persona Buttons',
        description: 'Explore the user experience tailored for specific team roles.',
        steps: [
          {
            stepNumber: 1,
            instruction: 'On the Login page, locate the "Quick Demo Login" buttons at the bottom.',
          },
          {
            stepNumber: 2,
            instruction: 'Click any persona: "Admin / Broker", "Top Producer Agent", "Inside Sales Agent (ISA)", or "Transaction Coordinator".',
          },
          {
            stepNumber: 3,
            instruction: 'The credentials fill automatically and log you straight into the dashboard tailored to that role.',
          },
        ],
        expectedResult: 'You immediately access the CRM with appropriate permissions, queues, and sample data.',
      },
    ],
    workarounds: [
      {
        id: 'auth-login-loop',
        issue: 'Login redirects back to /login after clicking Sign In',
        cause: 'Corrupted localStorage authentication token or third-party cookie blocking.',
        symptoms: ['Browser flashes dashboard briefly then returns to login'],
        recommendedWorkaround: {
          title: 'Clear Session Storage',
          steps: [
            'Click the "Quick Demo Login" button as Admin to overwrite stale tokens.',
            'Or press F12 > Application > Storage > Clear Site Data, then reload the page.',
          ],
        },
      },
    ],
    limitations: [
      {
        title: 'Demo Environment Mock Data',
        description: 'In demo mode, mock actions (e.g. simulated calls, test webhooks) operate against local storage memory.',
        impact: 'Mock leads and changes will reset when using private/incognito browsing windows.',
        remedyRecommendation: 'To persist production client data, connect live Twilio and PostgreSQL credentials in Settings.',
      },
    ],
    proTips: [
      {
        title: 'Test as ISA First',
        content: 'Log in as the Inside Sales Agent (ISA) persona to see how the speed-to-lead queue and AI Copilot takeover workflow operates in high-volume environments.',
      },
    ],
    quickLinks: [
      { label: 'Go to Dashboard', to: '/dashboard' },
    ],
  },
]

/**
 * Helper to find the matching feature guide for the current pathname.
 */
export function getFeatureGuideForPath(pathname: string): FeatureGuide {
  const normalized = pathname.toLowerCase()
  
  // Exact or prefix matches
  const match = FEATURE_GUIDES.find((guide) =>
    guide.routePatterns.some((pattern) => {
      if (pattern === '/' && (normalized === '/' || normalized === '/dashboard')) return true
      if (pattern !== '/' && normalized.startsWith(pattern)) return true
      return false
    })
  )

  return match || FEATURE_GUIDES[0]
}
