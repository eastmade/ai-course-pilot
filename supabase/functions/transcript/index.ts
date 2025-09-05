import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoId } = await req.json()
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    try {
      // First try to get captions
      const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${youtubeApiKey}`
      const captionsResponse = await fetch(captionsUrl)
      const captionsData = await captionsResponse.json()

      if (captionsResponse.ok && captionsData.items && captionsData.items.length > 0) {
        // Look for English captions
        const englishCaption = captionsData.items.find((caption: any) => 
          caption.snippet.language === 'en' || caption.snippet.language.startsWith('en')
        ) || captionsData.items[0]

        // Try to download the caption content
        const captionId = englishCaption.id
        const captionDownloadUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${youtubeApiKey}&tfmt=ttml`
        
        const captionResponse = await fetch(captionDownloadUrl)
        if (captionResponse.ok) {
          const captionContent = await captionResponse.text()
          
          // Parse TTML to extract text (simplified parsing)
          const textMatches = captionContent.match(/<p[^>]*>([^<]+)<\/p>/g)
          if (textMatches) {
            const transcript = textMatches
              .map(match => match.replace(/<[^>]+>/g, '').trim())
              .filter(text => text.length > 0)
              .join(' ')
            
            return new Response(
              JSON.stringify({ transcript }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
        }
      }
    } catch (captionError) {
      console.log('Caption extraction failed, falling back to description:', captionError)
    }

    // Fallback: Get video details for description
    try {
      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`
      const videoResponse = await fetch(videoUrl)
      const videoData = await videoResponse.json()

      if (videoResponse.ok && videoData.items && videoData.items.length > 0) {
        const description = videoData.items[0].snippet.description
        
        if (description && description.length > 100) {
          // Use description as fallback transcript
          return new Response(
            JSON.stringify({ 
              transcript: description,
              fallback: true 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }
    } catch (descriptionError) {
      console.log('Description extraction failed:', descriptionError)
    }

    // No transcript available
    return new Response(
      JSON.stringify({ noTranscript: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Transcript API error:', error)
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