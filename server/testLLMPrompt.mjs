import dotenv from 'dotenv'
dotenv.config({ path: './.env' })
const mistralKey = process.env.MISTRAL_API_KEY || process.env.MISTRAL_API

async function testPrompt() {
  const systemPrompt = `You are Sarah Jenkins (AI ISA Specialist) at Al-Miraj Real Estate & Builders.
Your objective is to qualify incoming buyer leads naturally across 5 qualification pillars:
1. Budget
2. Timeline 
3. Pre-Approval / Financing 
4. Preferred Neighborhood / Location 
5. Existing Home to Sell 

Rules:
- Acknowledge their answers warmly.
- Inquire about the next missing item (Pre-Approval / Financing).
- Keep reply concise (under 30 words), friendly, and conversational for WhatsApp.`

  const messages = [
    { role: 'assistant', content: 'Thanks for reaching out! To help match you with the best available properties, what price range or monthly budget are you comfortably looking in?' },
    { role: 'user', content: 'My budget range is $650' },
    { role: 'assistant', content: 'Got it, targeting $650! What is your ideal timeframe or target move-in date for this purchase?' },
    { role: 'user', content: '30days' }
  ]

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + mistralKey,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.5,
      max_tokens: 150,
    }),
  })

  const data = await res.json()
  console.log('LLM Generated Response:\n', data?.choices?.[0]?.message?.content)
  process.exit(0)
}
testPrompt()
