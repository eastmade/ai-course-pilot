import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Play, Users, Award } from 'lucide-react'

const Home = () => {
  const [topic, setTopic] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) {
      navigate(`/course?topic=${encodeURIComponent(topic.trim())}`)
    }
  }

  const handleDemo = () => {
    navigate('/course?topic=AI Product Management')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">AI Learning Copilot</span>
            </div>
            <Button variant="outline" onClick={() => navigate('/me')}>
              Profile
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Learn Anything with AI-Powered Courses
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform any topic into a structured learning path with curated videos, 
            AI-generated summaries, and interactive quizzes.
          </p>

          {/* Topic Input Form */}
          <Card className="max-w-md mx-auto mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="What do you want to learn? (e.g., Machine Learning, React, Product Design)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="text-center"
                />
                <Button type="submit" className="w-full" disabled={!topic.trim()}>
                  Create Learning Path
                </Button>
              </form>
              <div className="mt-4">
                <Button variant="ghost" onClick={handleDemo} className="text-sm">
                  Try a demo: AI Product Management
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Play className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Curated Videos</h3>
              <p className="text-muted-foreground">
                AI finds the best YouTube content and organizes it by difficulty level
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Summaries</h3>
              <p className="text-muted-foreground">
                Get key points, glossaries, and structured notes for every lesson
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Award className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Interactive Quizzes</h3>
              <p className="text-muted-foreground">
                Test your knowledge with AI-generated questions and detailed explanations
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default Home