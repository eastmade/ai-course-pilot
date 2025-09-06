import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react'
import { Lesson } from '@/types'
import { useToast } from '@/hooks/use-toast'

const LessonView = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [reflectionNotes, setReflectionNotes] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    // Get the course data from localStorage
    const courseData = localStorage.getItem('courseData')
    if (courseData) {
      try {
        const course = JSON.parse(courseData)
        setAllLessons(course.lessons)
        
        // Find the specific lesson by ID
        const foundLesson = course.lessons.find((l: Lesson) => l.id === id)
        if (foundLesson) {
          setLesson(foundLesson)
          const index = course.lessons.findIndex((l: Lesson) => l.id === id)
          setCurrentLessonIndex(index)
        } else {
          // Fallback to first lesson if ID not found
          setLesson(course.lessons[0])
          setCurrentLessonIndex(0)
        }
      } catch (error) {
        console.error('Error parsing course data:', error)
        toast({
          title: "Error",
          description: "Failed to load lesson data. Please try building a course first.",
          variant: "destructive"
        })
        navigate('/')
      }
    } else {
      toast({
        title: "No Course Data",
        description: "Please build a course first before viewing lessons.",
        variant: "destructive"
      })
      navigate('/')
    }
    
    // Check if lesson is completed
    const completed = JSON.parse(localStorage.getItem('completedLessonIds') || '[]')
    setIsCompleted(completed.includes(id))
    
    // Load saved reflection notes
    const savedNotes = localStorage.getItem(`reflection_${id}`)
    if (savedNotes) setReflectionNotes(savedNotes)
  }, [id, navigate, toast])

  const markAsCompleted = () => {
    const completed = JSON.parse(localStorage.getItem('completedLessonIds') || '[]')
    if (!completed.includes(id)) {
      completed.push(id)
      localStorage.setItem('completedLessonIds', JSON.stringify(completed))
      setIsCompleted(true)
      toast({
        title: "Lesson Completed!",
        description: "Great job! Your progress has been saved.",
      })
    }
  }

  const submitQuiz = () => {
    if (!lesson) return
    
    let correct = 0
    lesson.quiz.forEach((question, index) => {
      if (quizAnswers[index] === question.answerIndex) {
        correct++
      }
    })
    
    const score = (correct / lesson.quiz.length) * 100
    setQuizScore(score)
    setShowResults(true)
    
    // Update quiz stats
    const stats = JSON.parse(localStorage.getItem('quizStats') || '{"correct": 0, "total": 0}')
    stats.correct += correct
    stats.total += lesson.quiz.length
    localStorage.setItem('quizStats', JSON.stringify(stats))
    
    if (score >= 70) {
      markAsCompleted()
    }
  }

  const saveReflectionNotes = () => {
    localStorage.setItem(`reflection_${id}`, reflectionNotes)
    toast({
      title: "Notes Saved",
      description: "Your reflection notes have been saved locally.",
    })
  }

  const navigateToNext = () => {
    const nextIndex = currentLessonIndex + 1
    if (nextIndex < allLessons.length) {
      navigate(`/lesson/${allLessons[nextIndex].id}`)
    }
  }

  const navigateToPrevious = () => {
    const prevIndex = currentLessonIndex - 1
    if (prevIndex >= 0) {
      navigate(`/lesson/${allLessons[prevIndex].id}`)
    }
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lesson not found</h2>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{lesson.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{lesson.level}</Badge>
                  <span>{lesson.durationMin} min</span>
                  {isCompleted && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToPrevious}
                disabled={currentLessonIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToNext}
                disabled={currentLessonIndex === allLessons.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Video Player */}
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${lesson.videoId}`}
                  title={lesson.title}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{lesson.title}</h2>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={`https://youtube.com/watch?v=${lesson.videoId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      YouTube
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lesson Content Tabs */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
              <TabsTrigger value="reflection">Reflection</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{lesson.summary}</p>
                  
                  <h4 className="font-semibold mb-3">Key Points</h4>
                  <ul className="space-y-2">
                    {lesson.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Glossary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lesson.glossary.map((item, index) => (
                      <div key={index} className="border-l-2 border-primary/20 pl-4">
                        <h4 className="font-semibold">{item.term}</h4>
                        <p className="text-muted-foreground">{item.definition}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Check</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showResults ? (
                    <div className="space-y-6">
                      {lesson.quiz.map((question, qIndex) => (
                        <div key={qIndex} className="space-y-3">
                          <h4 className="font-medium">
                            {qIndex + 1}. {question.q}
                          </h4>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <label key={oIndex} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question_${qIndex}`}
                                  value={oIndex}
                                  checked={quizAnswers[qIndex] === oIndex}
                                  onChange={() => {
                                    const newAnswers = [...quizAnswers]
                                    newAnswers[qIndex] = oIndex
                                    setQuizAnswers(newAnswers)
                                  }}
                                  className="text-primary"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        onClick={submitQuiz}
                        disabled={quizAnswers.length !== lesson.quiz.length}
                        className="w-full"
                      >
                        Submit Quiz
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2">
                          {Math.round(quizScore)}%
                        </div>
                        <div className="text-muted-foreground mb-4">
                          {quizScore >= 70 ? 'Great job! You passed the quiz.' : 'Keep studying and try again.'}
                        </div>
                      </div>
                      
                      {lesson.quiz.map((question, qIndex) => {
                        const userAnswer = quizAnswers[qIndex]
                        const isCorrect = userAnswer === question.answerIndex
                        
                        return (
                          <div key={qIndex} className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">
                              {qIndex + 1}. {question.q}
                            </h4>
                            <div className={`p-2 rounded ${isCorrect ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                              <div className="text-sm">
                                Your answer: {question.options[userAnswer]} 
                                {isCorrect ? ' ✓' : ' ✗'}
                              </div>
                              {!isCorrect && (
                                <div className="text-sm text-muted-foreground">
                                  Correct: {question.options[question.answerIndex]}
                                </div>
                              )}
                              <div className="text-sm mt-2">{question.explanation}</div>
                            </div>
                          </div>
                        )
                      })}
                      
                      <Button 
                        onClick={() => {
                          setShowResults(false)
                          setQuizAnswers([])
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Retake Quiz
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reflection" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reflection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">What are the key insights you gained from this lesson?</h4>
                    <Textarea
                      placeholder="Write your thoughts here..."
                      value={reflectionNotes}
                      onChange={(e) => setReflectionNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">How will you apply this knowledge?</h4>
                    <Textarea
                      placeholder="Describe how you'll use what you learned..."
                      rows={4}
                    />
                  </div>
                  
                  <Button onClick={saveReflectionNotes}>
                    Save Notes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Continue Button */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4 md:hidden">
            <Button onClick={markAsCompleted} className="w-full">
              {isCompleted ? 'Lesson Completed' : 'Mark as Complete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LessonView