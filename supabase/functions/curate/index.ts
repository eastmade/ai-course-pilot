import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface VideoCandidate {
  videoId: string
  title: string
  channel: string
  views: number
  duration: string
  description: string
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

    // Search YouTube for videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&maxResults=20&order=relevance&key=${youtubeApiKey}`
    
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()

    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchData.error?.message || 'Unknown error'}`)
    }

    // Get detailed statistics for each video
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',')
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${youtubeApiKey}`
    
    const statsResponse = await fetch(statsUrl)
    const statsData = await statsResponse.json()

    if (!statsResponse.ok) {
      throw new Error(`YouTube API error: ${statsData.error?.message || 'Unknown error'}`)
    }

    // Combine search results with statistics and score them
    const videoCandidates: VideoCandidate[] = searchData.items.map((item: any) => {
      const stats = statsData.items.find((stat: any) => stat.id === item.id.videoId)
      const views = parseInt(stats?.statistics?.viewCount || '0')
      const duration = stats?.contentDetails?.duration || 'PT0S'
      
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        views,
        duration,
        description: item.snippet.description || ''
      }
    })

    // Score and filter videos
    const scoredVideos = videoCandidates
      .map(video => {
        // Parse duration (ISO 8601 format like PT15M30S)
        const durationMatch = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        const hours = parseInt(durationMatch?.[1] || '0')
        const minutes = parseInt(durationMatch?.[2] || '0') 
        const seconds = parseInt(durationMatch?.[3] || '0')
        const totalMinutes = hours * 60 + minutes + seconds / 60

        // Scoring algorithm
        let score = 0
        
        // Duration score (prefer 5-30 minute videos)
        if (totalMinutes >= 5 && totalMinutes <= 30) score += 30
        else if (totalMinutes >= 2 && totalMinutes <= 45) score += 15
        
        // View count score (logarithmic scale)
        if (video.views > 0) {
          score += Math.min(Math.log10(video.views) * 5, 25)
        }
        
        // Title relevance (simple keyword matching)
        const titleWords = video.title.toLowerCase()
        const topicWords = topic.toLowerCase().split(' ')
        const matches = topicWords.filter(word => titleWords.includes(word)).length
        score += (matches / topicWords.length) * 20
        
        // Description relevance
        const descWords = video.description.toLowerCase()
        const descMatches = topicWords.filter(word => descWords.includes(word)).length
        score += (descMatches / topicWords.length) * 10

        return { ...video, score, durationMin: Math.round(totalMinutes) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Top 8 videos

    return new Response(
      JSON.stringify(scoredVideos),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Curate API error:', error)
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