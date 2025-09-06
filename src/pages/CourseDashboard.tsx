import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Clock, BookOpen, Play, ArrowLeft } from 'lucide-react'
import { Course, Lesson } from '@/types'
import { useToast } from '@/hooks/use-toast'

const CourseDashboard = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  
  const topic = searchParams.get('topic')

  useEffect(() => {
    if (!topic) {
      navigate('/')
      return
    }

    const buildCourse = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/build-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic })
        })
        
        if (!response.ok) throw new Error('Failed to build course')
        
        const courseData = await response.json()
        setCourse(courseData)
        
        // Calculate progress from localStorage
        const completed = JSON.parse(localStorage.getItem('completedLessonIds') || '[]')
        const progressPercent = courseData.lessons.length > 0 
          ? (completed.length / courseData.lessons.length) * 100 
          : 0
        setProgress(progressPercent)
        
      } catch (error) {
        console.error('Error building course:', error)
        toast({
          title: "Error",
          description: "Failed to build course. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    buildCourse()
  }, [topic, navigate, toast])

  const getLevelColor = (level: Lesson['level']) => {
    switch (level) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const startLearning = () => {
    if (course?.lessons.length) {
      const lastViewed = localStorage.getItem('lastViewedLessonId')
      const lessonId = lastViewed || course.lessons[0].id
      navigate(`/lesson/${lessonId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Course not found</h2>
            <p className="text-muted-foreground mb-4">Unable to generate course content.</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">{course.topic}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Learning Path */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Learning Path</h2>
              <div className="text-sm text-muted-foreground">
                Progress: {Math.round(progress)}%
              </div>
            </div>
            <Progress value={progress} className="mb-6" />
            
            <div className="space-y-4">
              {course.lessons.map((lesson, index) => {
                const isCompleted = JSON.parse(localStorage.getItem('completedLessonIds') || '[]').includes(lesson.id)
                
                return (
                  <Card 
                    key={lesson.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isCompleted ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''
                    }`}
                    onClick={() => navigate(`/lesson/${lesson.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Lesson {index + 1}
                            </span>
                            <Badge className={getLevelColor(lesson.level)}>
                              {lesson.level}
                            </Badge>
                            {isCompleted && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ✓ Completed
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2">{lesson.title}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {lesson.durationMin} min
                          </div>
                        </div>
                        <Play className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Course Overview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{course.overview.tlDr}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{course.overview.lessonCount}</div>
                    <div className="text-sm text-muted-foreground">Lessons</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{course.overview.totalDurationMin}m</div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                </div>

                <Button onClick={startLearning} className="w-full" size="lg">
                  {progress > 0 ? 'Continue Learning' : 'Start Learning'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDashboard