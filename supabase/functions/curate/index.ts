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

    // Enhanced search strategy with multiple queries for better relevance
    const searchQueries = [
      `${topic} tutorial learn beginner guide`,
      `${topic} explained step by step`,
      `${topic} course lesson introduction`,
      `how to ${topic} basics fundamentals`
    ]

    let allVideos: any[] = []
    
    // Search with multiple query strategies
    for (const query of searchQueries) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=15&order=relevance&key=${youtubeApiKey}&videoDuration=medium&videoDefinition=high&safeSearch=strict`
      
      const searchResponse = await fetch(searchUrl)
      const searchData = await searchResponse.json()

      if (!searchResponse.ok) {
        console.warn(`YouTube API warning for query "${query}": ${searchData.error?.message}`)
        continue
      }

      allVideos.push(...searchData.items)
    }

    // Remove duplicates by videoId
    const uniqueVideos = allVideos.filter((video, index, self) => 
      index === self.findIndex(v => v.id.videoId === video.id.videoId)
    )

    if (uniqueVideos.length === 0) {
      throw new Error('No videos found for the given topic')
    }

    // Get detailed statistics for each video
    const videoIds = uniqueVideos.map((item: any) => item.id.videoId).join(',')
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${youtubeApiKey}`
    
    const statsResponse = await fetch(statsUrl)
    const statsData = await statsResponse.json()

    if (!statsResponse.ok) {
      throw new Error(`YouTube API error: ${statsData.error?.message || 'Unknown error'}`)
    }

    // Combine search results with statistics and score them
    const videoCandidates: VideoCandidate[] = uniqueVideos.map((item: any) => {
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

        // Enhanced AI-driven scoring algorithm
        let score = 0
        
        // Duration score (prefer educational-length videos)
        if (totalMinutes >= 8 && totalMinutes <= 25) score += 40
        else if (totalMinutes >= 5 && totalMinutes <= 35) score += 25
        else if (totalMinutes >= 3 && totalMinutes <= 45) score += 10
        
        // View count quality score (balanced approach)
        if (video.views > 1000) {
          const viewScore = Math.min(Math.log10(video.views / 1000) * 8, 30)
          score += viewScore
        }
        
        // Educational keywords bonus
        const titleLower = video.title.toLowerCase()
        const descLower = video.description.toLowerCase()
        const educationalKeywords = ['tutorial', 'learn', 'guide', 'course', 'lesson', 'explained', 'introduction', 'beginner', 'step by step', 'how to', 'basics', 'fundamentals']
        const educationalBonus = educationalKeywords.filter(keyword => 
          titleLower.includes(keyword) || descLower.includes(keyword)
        ).length
        score += educationalBonus * 8
        
        // Topic relevance (improved keyword matching)
        const topicWords = topic.toLowerCase().split(' ')
        const titleMatches = topicWords.filter(word => titleLower.includes(word)).length
        const descMatches = topicWords.filter(word => descLower.includes(word)).length
        score += (titleMatches / topicWords.length) * 35
        score += (descMatches / topicWords.length) * 15
        
        // Channel quality indicators
        const channelLower = video.channel.toLowerCase()
        const qualityChannelIndicators = ['academy', 'university', 'education', 'school', 'institute', 'tech', 'programming', 'coding']
        const channelBonus = qualityChannelIndicators.filter(indicator => 
          channelLower.includes(indicator)
        ).length
        score += channelBonus * 5
        
        // Penalize clickbait-style titles
        const clickbaitWords = ['amazing', 'incredible', 'shocking', 'you won\'t believe', 'secret', 'hack']
        const clickbaitPenalty = clickbaitWords.filter(word => titleLower.includes(word)).length
        score -= clickbaitPenalty * 10

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