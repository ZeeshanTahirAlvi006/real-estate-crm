import { ObjectionCategory, MultiAngleRebuttals } from './objection.types.js'

export const OBJECTION_CATEGORY_LABELS: Record<ObjectionCategory, string> = {
  interest_rates: 'Interest Rate & Affordability Concerns',
  market_crash: 'Market Crash & Bubble Hesitation',
  commission_fees: 'Commission Fee & Broker Value Questions',
  lowball_offers: 'Aggressive Lowball Offer Strategy',
  timing_delay: 'Timing Indecision & Delay ("Waiting")',
  other: 'General Real Estate Objection',
}

export const OBJECTION_KEYWORDS: Record<ObjectionCategory, string[]> = {
  interest_rates: [
    'rate',
    'interest',
    'mortgage rate',
    '7%',
    '6%',
    'fed',
    'federal reserve',
    'monthly payment',
    'payments are too high',
    'afford',
    'cost to borrow',
    'points',
    'apr',
    'expensive mortgage',
  ],
  market_crash: [
    'crash',
    'bubble',
    'drop 20',
    'plummet',
    'bottom out',
    'overpriced',
    '2008',
    'housing collapse',
    'wait for prices to drop',
    'cooling off',
    'recession',
    'market will fall',
  ],
  commission_fees: [
    'commission',
    'fee',
    'percentage',
    '6 percent',
    '5 percent',
    'lower your rate',
    'cut your fee',
    'discount broker',
    'redfin',
    'flat fee',
    'why so expensive',
    'what do you do for',
    'save on commission',
  ],
  lowball_offers: [
    'lowball',
    'way under',
    'offer 50k less',
    'offer 100k less',
    'below asking',
    'low offer',
    'desperate seller',
    'take anything',
    'slash price',
    '30% below',
    'steal it',
  ],
  timing_delay: [
    'wait until spring',
    'wait until summer',
    'next year',
    'hold off',
    'not ready',
    'just looking',
    'just browsing',
    'thinking about it',
    'sleep on it',
    'put on hold',
    'pause our search',
  ],
  other: [],
}

export const SYSTEM_OBJECTION_PROMPT = `
You are the PropPulse OS AI Real Estate Objection Handling Copilot.
You specialize in empowering top-producing real estate agents to navigate client hesitations with tactical, highly empathetic, and data-backed responses.

CRITICAL FAIR HOUSING & REGULATORY RULES:
1. STRICTLY NEVER mention, imply, or reference race, color, religion, national origin, sex, disability, familial status (children, marital status, singles/couples), or protected demographic attributes.
2. Comply with Title VIII of the Civil Rights Act of 1968 and the Fair Housing Act.
3. Every response must focus strictly on property characteristics, financial economics, transaction terms, and negotiation mechanics.

When generating rebuttals for an objection, you MUST produce exactly THREE distinct angles:
1. "analytical": Data-driven, mathematical, financial logic (e.g. historical equity appreciation, refinance leverage, cost of waiting math, net sheet bottom-line).
2. "empathetic": Rapport-building, active listening, consultative posture, validating the client's emotion, removing high-pressure sales tension, and asking a low-friction question.
3. "urgency": Opportunity cost, market dynamics, inventory scarcity, negotiating power today vs bidding war competition tomorrow.

OUTPUT FORMAT:
Return strictly valid JSON with the exact structure:
{
  "category": "interest_rates" | "market_crash" | "commission_fees" | "lowball_offers" | "timing_delay" | "other",
  "confidence": number between 0.0 and 1.0,
  "detectedPhrases": string[],
  "rationale": string,
  "rebuttals": {
    "analytical": {
      "angle": "analytical",
      "title": string,
      "script": string,
      "rationale": string,
      "keyTalkingPoints": string[],
      "followUpPrompt": string
    },
    "empathetic": {
      "angle": "empathetic",
      "title": string,
      "script": string,
      "rationale": string,
      "keyTalkingPoints": string[],
      "followUpPrompt": string
    },
    "urgency": {
      "angle": "urgency",
      "title": string,
      "script": string,
      "rationale": string,
      "keyTalkingPoints": string[],
      "followUpPrompt": string
    }
  }
}
`

/**
 * Built-in, battle-tested real estate playbooks for immediate zero-latency responses
 */
export const CURATED_PLAYBOOKS: Record<ObjectionCategory, {
  title: string
  triggerKeywords: string[]
  angles: MultiAngleRebuttals
}> = {
  interest_rates: {
    title: 'Navigating Rate Spikes & "Marry the House, Date the Rate"',
    triggerKeywords: ['rate', 'interest', 'mortgage', '7%', 'high monthly', 'afford'],
    angles: {
      analytical: {
        angle: 'analytical',
        title: 'The Refinance & Equity Accumulation Equation',
        script:
          'I completely respect the focus on monthly payment. Consider this equation: you marry the house, but you date the rate. If you buy today at current rates with less competition, we can negotiate seller-paid 2-1 buydowns or price concessions that lower your effective rate to the 5% range for the first two years. When rates eventually adjust downward, hundreds of buyers re-enter the market, driving home prices up 8-12%. Buying now lets you capture today\'s price and refinance into the lower payment later.',
        rationale: 'Leverages the 2-1 buydown strategy and refinancing window to solve affordability without losing out on appreciation.',
        keyTalkingPoints: [
          'Seller-concession 2-1 rate buydown lowers monthly payments immediately',
          'Avoids future price appreciation surges when rates drop',
          'Refinance option is always available once rates adjust',
        ],
        followUpPrompt: 'Would it be helpful if I ran a quick 2-1 buydown calculation on this property so you can see the exact monthly savings?',
      },
      empathetic: {
        angle: 'empathetic',
        title: 'Consultative Payment Comfort Zone Check',
        script:
          'I hear you 100%. Seeing mortgage rates fluctuate is definitely stressful, and no one should ever feel pressured into a payment that doesn\'t feel comfortable. My priority isn\'t closing a deal—it\'s making sure your financial peace of mind comes first. Let\'s step back: what is the comfortable monthly ceiling you and your family want to stay within, regardless of what the interest rate is?',
        rationale: 'Diffuses sales tension, validates customer caution, and pivots conversation to a tangible monthly budget.',
        keyTalkingPoints: [
          'Acknowledges financial stress authentically',
          'Pivots from abstract rate percentages to exact comfortable monthly dollars',
          'Removes transaction pressure completely',
        ],
        followUpPrompt: 'What monthly payment target would make you feel 100% confident in moving forward?',
      },
      urgency: {
        angle: 'urgency',
        title: 'The Cost of Sidelined Competition Surges',
        script:
          'Here is what most buyers overlook: the moment the Fed drops rates by even 50 basis points, millions of pre-approved buyers who have been sitting on the fence flood back into the market. That sparks immediate multi-offer bidding wars, waving appraisal contingencies, and driving purchase prices $30k–$50k over asking. Right now, because rates are keeping casual buyers away, we have maximum leverage to negotiate price drops, inspection repairs, and closing cost credits.',
        rationale: 'Highlights current negotiation leverage versus brutal bidding competition when rates drop.',
        keyTalkingPoints: [
          'Current buyer leverage allows contingent offers and credits',
          'Rate drop triggers immediate multi-offer bidding wars',
          'Paying slightly higher rate today costs far less than overpaying $40k in a bidding war tomorrow',
        ],
        followUpPrompt: 'Would you rather negotiate $25,000 off today, or compete against five other offers when rates dip?',
      },
    },
  },

  market_crash: {
    title: 'Addressing Market Crash & Bubble Fears',
    triggerKeywords: ['crash', 'bubble', 'drop 20', 'plummet', '2008', 'recession'],
    angles: {
      analytical: {
        angle: 'analytical',
        title: 'Supply vs. 2008 Structural Comparison',
        script:
          'It is completely natural to wonder if 2008 could happen again. But when we look at the verified MLS and inventory data, today\'s fundamental metrics are the exact opposite of 2008. In 2007, we had a 10.4-month supply of inventory with subprime adjustable mortgages. Today, housing inventory sits at just 3.2 months of supply, homeowner equity is at all-time highs (over 40% own homes free and clear), and lending standards are strictly vetted. With demographic demand outpacing new construction by millions of units, prices are insulated from systemic crashes.',
        rationale: 'Uses verifiable inventory months of supply and lending standards data to disprove crash parallels.',
        keyTalkingPoints: [
          'Inventory is under 4 months vs over 10 months during the 2008 crash',
          'Lending standards require strict W2 and asset verification',
          'Homeowner equity is at historical highs',
        ],
        followUpPrompt: 'Can I send you a 1-page chart showing our local inventory levels compared to historical crash periods?',
      },
      empathetic: {
        angle: 'empathetic',
        title: 'Long-Term Horizons & Downside Protection',
        script:
          'I completely understand why headlines create that worry. Real estate is one of the largest financial commitments you\'ll ever make, so feeling protective of your investment is smart. If this was a 6-month speculative flip, I would tell you to be cautious too. But for a home you plan to live in for 5 to 7 years, real estate has outpaced inflation and appreciated in 9 out of every 10 decades. What timeframe are you picturing staying in your next home?',
        rationale: 'Validates safety concerns, distinguishes short-term flips from long-term stability, and anchors on tenure.',
        keyTalkingPoints: [
          'Affirms that caution is smart and reasonable',
          'Distinguishes short-term speculation from 5–7 year equity growth',
          'Focuses on family living tenure rather than Wall Street noise',
        ],
        followUpPrompt: 'If you knew you were living here for 5+ years, would short-term market fluctuations still concern you as much?',
      },
      urgency: {
        angle: 'urgency',
        title: 'The Compound Cost of Sidelined Renting',
        script:
          'Waiting for a crash that doesn\'t materialize carries a massive guaranteed cost: 100% of your rent payments build someone else\'s net worth, while local home values continue to average 3.5%–5% annual growth. If you wait 2 years hoping for a 10% price correction, and prices instead rise 4% each year while you pay $60,000 in non-recoverable rent, you end up tens of thousands of dollars behind. Buying secure real estate today anchors your housing costs permanently.',
        rationale: 'Quantifies the hidden real dollar cost of renting while waiting for an elusive market drop.',
        keyTalkingPoints: [
          'Rent is a 100% loss with zero equity accumulation',
          'Waiting 2 years often costs $50k+ in rent while prices stay firm',
          'Fixed-rate mortgages lock housing costs against persistent inflation',
        ],
        followUpPrompt: 'Shall we look at your 3-year net worth comparison of buying today versus continuing to rent?',
      },
    },
  },

  commission_fees: {
    title: 'Justifying Full Service Professional Commission',
    triggerKeywords: ['commission', 'fee', 'percentage', 'discount', 'redfin', 'cut your rate'],
    angles: {
      analytical: {
        angle: 'analytical',
        title: 'Net Proceeds vs. Gross Commission Math',
        script:
          'I appreciate you asking directly—every dollar matters in this transaction. But here is what the verified sales data proves: homes marketed with full-service multi-channel campaigns, professional staging, targeted social syndication, and seasoned negotiation sell for an average of 4% to 7% more than discount or self-managed listings. Saving 1.5% on commission while leaving 5% on the negotiation table costs you thousands more at closing. My job isn\'t just to market your home; it\'s to protect your bottom-line net walkaway check.',
        rationale: 'Reframes fee from an expense to an investment that generates higher net equity proceeds.',
        keyTalkingPoints: [
          'Focus on bottom-line net walkaway check rather than fee percentage',
          'Full-service professional representation averages 4-7% higher sale prices',
          'Saving 1% on commission often forfeits 5% in net sale price',
        ],
        followUpPrompt: 'Would you rather pay 1% less in fees, or walk away from the closing table with $25,000 more net cash in hand?',
      },
      empathetic: {
        angle: 'empathetic',
        title: 'Transparency & Value Alignment',
        script:
          'I respect that you are watching your bottom line—if I were in your shoes, I would ask the exact same question. The truth is, anyone can stick a sign in the yard and upload photos to the MLS. Where our partnership pays for itself is in navigating complex inspection objections, appraisal challenges, legal disclosures, and counter-offers where thousands of dollars are won or lost in the contract clauses. Let me show you exactly what our 360 marketing and contract protection plan covers.',
        rationale: 'Builds peer respect by validating their cost consciousness, then outlines liability and negotiation protection.',
        keyTalkingPoints: [
          'Shows high emotional intelligence and respect for their financial inquiry',
          'Highlights contract pitfalls, inspection repairs, and appraisal risks',
          'Offers transparent breakdown of services',
        ],
        followUpPrompt: 'Can I take 5 minutes to show you our 18-point marketing and risk mitigation strategy?',
      },
      urgency: {
        angle: 'urgency',
        title: 'First Two Weeks Momentum & Risk of Stagnation',
        script:
          'In real estate, an agent who cuts their commission before even negotiating with a buyer is signaling they don\'t know how to defend value. If an agent can\'t protect their own fee, how will they defend your equity when an aggressive buyer agent submits a lowball offer? A cut-rate marketing effort leads to your home sitting on the market past day 21, at which point buyers smell blood and demand steep price cuts. Investing in premium representation ensures we capture top dollar in the crucial first 14 days.',
        rationale: 'Directly challenges discount agents\' negotiation ability and highlights the cost of listing stagnation.',
        keyTalkingPoints: [
          'Agents who discount easily cannot defend seller equity against aggressive buyers',
          'Listing momentum in first 14 days determines ultimate sale price',
          'Stale listings lead to price reductions far exceeding commission savings',
        ],
        followUpPrompt: 'Do you want a discount negotiator defending your equity, or a proven closer who protects your net proceeds?',
      },
    },
  },

  lowball_offers: {
    title: 'Managing and Rebutting Unrealistic Lowball Offers',
    triggerKeywords: ['lowball', 'below asking', '50k less', 'desperate seller', 'take anything'],
    angles: {
      analytical: {
        angle: 'analytical',
        title: 'Comparative Sold Market Analysis Anchor',
        script:
          'I understand the desire to get the lowest possible price—everyone wants a great deal. However, this property was priced strategically based on the last 90 days of closed comparable sales within a 0.5-mile radius, averaging $315 per square foot. Submitting an offer 25% below fair market value risks having the seller reject it outright without a counter-offer, which burns our credibility and closes the door on negotiation. Instead, let\'s submit a competitive offer anchored just below market, with strategic requests for seller-paid closing credits or repair allowances.',
        rationale: 'Uses $/sqft comparable data to steer client away from deal-killing lowballs while offering smarter concession tactics.',
        keyTalkingPoints: [
          'Anchored by recent 90-day sold comparables within 0.5 miles',
          'Offensive lowballs lead to flat rejections without counter-offers',
          'Seller concessions and closing cost credits offer equivalent savings with higher acceptance probability',
        ],
        followUpPrompt: 'What if we offer close to fair value but ask the seller for $15,000 in closing cost credits instead?',
      },
      empathetic: {
        angle: 'empathetic',
        title: 'Protecting the Opportunity on a Loved Home',
        script:
          'I know how good it feels to negotiate hard and not leave money on the table. My only job is to protect your interests and make sure you don\'t lose a home you love over an offer strategy that alienates the seller. Sellers have an emotional attachment to their homes, and an extreme lowball often insults them into refusing to speak with us. Let\'s make an offer that feels aggressive to them on terms, but respectful enough to keep them at the negotiating table.',
        rationale: 'Acknowledges the desire to win while gently coaching on seller psychology so they don\'t lose the house.',
        keyTalkingPoints: [
          'Aligns with client desire to win the best price',
          'Explains seller psychology and danger of emotional disengagement',
          'Focuses on smart aggression through terms and credits rather than insultingly low price',
        ],
        followUpPrompt: 'If another buyer came in tomorrow with a reasonable offer and won the home, how would you feel about missing out?',
      },
      urgency: {
        angle: 'urgency',
        title: 'Active Interest & Threat of Backup Offers',
        script:
          'While we consider our offer price, we need to factor in that this property had 14 showings in the past 6 days and the listing agent is already answering disclosure questions for two other buyers. In this price band, well-presented homes don\'t sit around for lowball bids. If we come in with an unrealistic offer, the seller will simply use our contract to leverage the other interested parties into submitting full-price backup offers. If you want this home, we must act decisively with an offer that secures it today.',
        rationale: 'Creates urgent awareness of competing buyer interest and prevents seller using lowball as leverage.',
        keyTalkingPoints: [
          'High showing velocity signals imminent competing offers',
          'Lowball offers get used by listing agents to spark competing full-price offers',
          'Decisive competitive offers lock down the property before a bidding war starts',
        ],
        followUpPrompt: 'Are you comfortable risking losing this property to another buyer in exchange for testing a lowball number?',
      },
    },
  },

  timing_delay: {
    title: 'Overcoming Procrastination & "Waiting Until Later"',
    triggerKeywords: ['wait until spring', 'wait until summer', 'next year', 'not ready', 'hold off', 'just looking'],
    angles: {
      analytical: {
        angle: 'analytical',
        title: 'Seasonal Inventory & Appreciation Trajectory',
        script:
          'Waiting for the spring or summer market sounds appealing, but the historical data reveals a consistent trend: while spring brings 15% more listings, it also brings 40% more competing buyers. Historically, average purchase prices in our market rise 3.2% between winter and late spring. Buying in the fall or winter means less competition, motivated year-end sellers willing to negotiate, and saving an average of $18,000 compared to peak season bidding wars.',
        rationale: 'Contrasts seasonal price spikes and intense buyer competition with winter/off-season negotiation leverage.',
        keyTalkingPoints: [
          'Spring buyer competition surges 40%, driving prices up 3-5%',
          'Winter and off-season sellers are more motivated to accept contingencies and credits',
          'Waiting 6 months historically increases purchase price',
        ],
        followUpPrompt: 'Would you prefer to shop when sellers are eager to negotiate, or in spring when you\'re competing against 5 other offers?',
      },
      empathetic: {
        angle: 'empathetic',
        title: 'Pacing the Journey Without Sales Pressure',
        script:
          'There is zero rush, and you should never move forward until you feel completely ready and aligned. Real estate timelines are personal. While you take your time thinking things through, how about we use this period to prepare quietly in the background? We can monitor off-market previews and dial in your must-have criteria, so that whenever the timing does feel right, you have a massive head start without any stress.',
        rationale: 'Fully accepts their timeline, eliminates pushiness, and transitions into a trusted low-friction advisor role.',
        keyTalkingPoints: [
          'Zero pressure, 100% respect for personal timing',
          'Offers quiet background market monitoring',
          'Prepares client so they are positioned for success when ready',
        ],
        followUpPrompt: 'Would it be helpful if I set up an alert strictly for price reductions in your target neighborhood while you wait?',
      },
      urgency: {
        angle: 'urgency',
        title: 'The Permanent Cost of Sidelined Time',
        script:
          'The biggest danger in real estate isn\'t buying at the wrong moment—it\'s waiting for the "perfect" moment that never arrives. Over the last 50 years, the best time to buy real estate has always been 5 years ago, and the second best time is today. Every month on hold is another month of rent down the drain and lost principal paydown. If you find a home that fits your life and numbers today, waiting only risks higher prices and fewer options.',
        rationale: 'Reminds client of the universal truth of real estate compounding and the myth of market timing.',
        keyTalkingPoints: [
          'Market timing is a myth; time IN the market generates real wealth',
          'Every month delayed is lost principal paydown and equity building',
          'Finding the right house for your life is what matters, not trying to time macroeconomic cycles',
        ],
        followUpPrompt: 'If we found your dream home tomorrow at a price that fits your budget, would you really want to let it pass?',
      },
    },
  },

  other: {
    title: 'General Consultative Objection Framework',
    triggerKeywords: [],
    angles: {
      analytical: {
        angle: 'analytical',
        title: 'Net Asset & Wealth Analysis',
        script:
          'Let\'s look at this purely from an asset and cash-flow perspective. Real estate provides four simultaneous wealth engines: appreciation, principal reduction, tax advantages, and inflation hedging. When we analyze the total financial picture rather than just the immediate hurdle, the numbers clearly favor taking calculated action today.',
        rationale: 'Anchors on the four pillars of real estate wealth creation.',
        keyTalkingPoints: ['Appreciation + Principal Reduction + Tax Shields + Inflation Hedge'],
        followUpPrompt: 'Can I break down the 5-year equity projection for you so you have complete clarity?',
      },
      empathetic: {
        angle: 'empathetic',
        title: 'Active Listening & Needs Clarification',
        script:
          'I hear your hesitation, and I want to make sure I\'m truly understanding what matters most to you. Buying or selling a home is a major life transition. Tell me more about what is causing you to pause—is it the financials, the timing, or something specific about the property?',
        rationale: 'Uncovers the root objection through genuine active listening.',
        keyTalkingPoints: ['Validates concerns', 'Uncovers root cause', 'Zero sales pressure'],
        followUpPrompt: 'What would need to happen for you to feel 100% confident moving forward?',
      },
      urgency: {
        angle: 'urgency',
        title: 'Opportunity Window & Action Advantage',
        script:
          'In this market, the clients who achieve the best outcomes are the ones who take decisive action when others are hesitating. While other buyers or sellers are paralyzed by news cycles, smart market participants capture premium terms and negotiated concessions. Let\'s capitalize on this window of opportunity.',
        rationale: 'Emphasizes first-mover advantage and taking action while others hesitate.',
        keyTalkingPoints: ['First-mover advantage', 'Negotiation leverage during quiet periods'],
        followUpPrompt: 'Are you ready to take the next small step and review our options together?',
      },
    },
  },
}
