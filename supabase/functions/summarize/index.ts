import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transcript, title, description, levelGuess } = await req.json()
    
    if (!transcript && !description) {
      return new Response(
        JSON.stringify({ error: 'Transcript or description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const content = transcript || description || ''
    
    const systemPrompt = `You are an expert educational content analyzer. Your task is to analyze video content and create structured learning materials. You must respond with valid JSON only, no additional text.

The JSON structure must be:
{
  "summary": "2-3 sentence overview of the main topic",
  "keyPoints": ["point 1", "point 2", ...], // 4-6 key learning points
  "glossary": [{"term": "Term", "definition": "Definition"}, ...], // 3-5 important terms
  "quiz": [
    {
      "q": "Question text",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "explanation": "Why this is correct"
    }
  ], // exactly 5 questions
  "level": "Beginner|Intermediate|Advanced"
}`

    const userPrompt = `Analyze this educational content and create structured learning materials:

Title: ${title || 'Unknown'}
Suggested Level: ${levelGuess || 'Unknown'}

Content:
${content.substring(0, 4000)}

Create a summary, key points, glossary, and 5 multiple-choice questions with explanations. Determine the appropriate difficulty level based on the content complexity.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const aiResponse = await response.json()
    const aiContent = aiResponse.choices?.[0]?.message?.content

    if (!aiContent) {
      throw new Error('No response from OpenAI')
    }

    try {
      // Parse the AI response as JSON
      const lessonData = JSON.parse(aiContent)
      
      // Validate the structure
      if (!lessonData.summary || !lessonData.keyPoints || !lessonData.glossary || !lessonData.quiz || !lessonData.level) {
        throw new Error('Invalid lesson data structure from AI')
      }

      // Ensure quiz has exactly 5 questions
      if (!Array.isArray(lessonData.quiz) || lessonData.quiz.length !== 5) {
        throw new Error('Quiz must have exactly 5 questions')
      }

      return new Response(
        JSON.stringify(lessonData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('AI Response:', aiContent)
      
      // Return a fallback structure
      const fallbackData = {
        summary: "This lesson covers important concepts related to the topic.",
        keyPoints: [
          "Key concept from the video content",
          "Important learning objective",
          "Practical application",
          "Main takeaway"
        ],
        glossary: [
          { term: "Key Term", definition: "Definition based on content" }
        ],
        quiz: [
          {
            q: "What is the main topic of this lesson?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            answerIndex: 0,
            explanation: "Based on the video content, this is the correct answer."
          },
          {
            q: "Which concept is most important?",
            options: ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
            answerIndex: 1,
            explanation: "This concept is emphasized throughout the lesson."
          },
          {
            q: "How should this knowledge be applied?",
            options: ["Method A", "Method B", "Method C", "Method D"],
            answerIndex: 2,
            explanation: "This is the recommended approach based on the content."
          },
          {
            q: "What is the key benefit discussed?",
            options: ["Benefit A", "Benefit B", "Benefit C", "Benefit D"],
            answerIndex: 0,
            explanation: "This benefit is highlighted as most significant."
          },
          {
            q: "Which next step is recommended?",
            options: ["Step A", "Step B", "Step C", "Step D"],
            answerIndex: 3,
            explanation: "This step follows logically from the lesson content."
          }
        ],
        level: levelGuess || "Beginner"
      }

      return new Response(
        JSON.stringify(fallbackData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Summarize API error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})