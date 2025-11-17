import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { text, model } = await req.json()
    
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const selectedModel = model || 'gpt-4o-mini'

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Assistent, der prägnante, aussagekräftige Titel für Tagebucheinträge generiert. Der Titel soll kurz (maximal 5-7 Wörter), informativ und ansprechend sein. Antworte NUR mit dem Titel, ohne zusätzliche Erklärungen oder Anführungszeichen.'
        },
        {
          role: 'user',
          content: `Erstelle einen Titel für diesen Tagebucheintrag:\n\n${text.substring(0, 1000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 50,
    })

    const title = completion.choices[0]?.message?.content?.trim() || 'Tagebucheintrag'

    return NextResponse.json({ title })
  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json(
      { error: 'Title generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
