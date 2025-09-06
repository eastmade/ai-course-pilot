import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)

interface Lesson {
  id: string
  topic: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  videoId: string
  title: string
  durationMin: number
  summary: string
  keyPoints: string[]
  glossary: { term: string, definition: string }[]
  quiz: { q: string, options: string[], answerIndex: number, explanation: string }[]
}

interface Course {
  topic: string
  lessons: Lesson[]
  overview: { tlDr: string, totalDurationMin: number, lessonCount: number }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic } = await req.json()
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Building course for topic: ${topic}`)

    // Step 1: Curate videos
    const { data: videoCandidates, error: curateError } = await supabase.functions.invoke('curate', { body: { topic } })
    if (curateError || !videoCandidates) {
      throw new Error('Failed to curate videos')
    }
    console.log(`Found ${videoCandidates.length} video candidates`)

    // Step 2: Process each video (transcript + summarize)
    const lessons: Lesson[] = []
    const targetLessons = Math.min(5, videoCandidates.length)

    for (let i = 0; i < targetLessons; i++) {
      const video = videoCandidates[i]
      console.log(`Processing video ${i + 1}: ${video.title}`)

      try {
        // Get transcript
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('transcript', {
          body: { videoId: video.videoId }
        })

        if (transcriptError) {
          throw transcriptError
        }

        if (transcriptData?.noTranscript) {
          console.log(`No transcript available for video ${video.videoId}, using description`)
        }

        const transcript = transcriptData?.transcript
        const hasTranscript = !transcriptData?.noTranscript

        // Determine level based on position and complexity
        let levelGuess: 'Beginner' | 'Intermediate' | 'Advanced'
        if (i < 2) levelGuess = 'Beginner'
        else if (i < 4) levelGuess = 'Intermediate'
        else levelGuess = 'Advanced'

        // Summarize content
        const { data: lessonContent, error: summarizeError } = await supabase.functions.invoke('summarize', {
          body: {
            transcript: hasTranscript ? transcript : null,
            title: video.title,
            description: !hasTranscript ? (transcript || video.description) : video.description,
            levelGuess
          }
        })

        if (summarizeError || !lessonContent) {
          console.log(`Failed to summarize video ${video.videoId}, creating fallback lesson`)
          
          // Create a basic lesson structure as fallback
          const fallbackLesson: Lesson = {
            id: `lesson_${i + 1}`,
            topic,
            level: levelGuess,
            videoId: video.videoId,
            title: video.title,
            durationMin: video.durationMin || 10,
            summary: `This lesson covers ${video.title.toLowerCase()}. Learn key concepts and practical applications.`,
            keyPoints: [
              "Understanding the main concepts",
              "Practical applications",
              "Key takeaways",
              "Next steps"
            ],
            glossary: [
              { term: "Key Concept", definition: "Important idea from this lesson" }
            ],
            quiz: [
              {
                q: `What is the main focus of "${video.title}"?`,
                options: ["Concept A", "Concept B", "Concept C", "Concept D"],
                answerIndex: 0,
                explanation: "Based on the video title and content, this is the primary focus."
              }
            ]
          }
          lessons.push(fallbackLesson)
          continue
        }

        const lesson: Lesson = {
          id: `lesson_${i + 1}`,
          topic,
          level: lessonContent.level || levelGuess,
          videoId: video.videoId,
          title: video.title,
          durationMin: video.durationMin || 10,
          summary: lessonContent.summary || `Learn about ${video.title}`,
          keyPoints: lessonContent.keyPoints || ["Key learning points from the video"],
          glossary: lessonContent.glossary || [],
          quiz: lessonContent.quiz || []
        }

        lessons.push(lesson)
        console.log(`Successfully processed lesson ${i + 1}`)

      } catch (error) {
        console.error(`Error processing video ${video.videoId}:`, error)
        
        // Create a minimal fallback lesson
        const fallbackLesson: Lesson = {
          id: `lesson_${i + 1}`,
          topic,
          level: 'Beginner',
          videoId: video.videoId,
          title: video.title,
          durationMin: video.durationMin || 10,
          summary: `Learn about ${topic} through this video lesson.`,
          keyPoints: ["Key concepts from the video"],
          glossary: [],
          quiz: []
        }
        lessons.push(fallbackLesson)
      }
    }

    // Sort lessons by level (Beginner -> Intermediate -> Advanced)
    const levelOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 }
    lessons.sort((a, b) => levelOrder[a.level] - levelOrder[b.level])

    // Create course overview
    const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.durationMin, 0)
    const course: Course = {
      topic,
      lessons,
      overview: {
        tlDr: `A comprehensive ${lessons.length}-lesson course on ${topic}, covering everything from basics to advanced concepts. Perfect for structured learning with videos, quizzes, and practical exercises.`,
        totalDurationMin: totalDuration,
        lessonCount: lessons.length
      }
    }

    console.log(`Course built successfully: ${lessons.length} lessons, ${totalDuration} minutes total`)

    // Cache the result for 24 hours (in a real app, you'd use Redis or similar)
    // For now, we'll just return the course
    
    return new Response(
      JSON.stringify(course),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400' // 24 hours
        }
      }
    )

  } catch (error) {
    console.error('Build course API error:', error)
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