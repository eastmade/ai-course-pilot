import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Trophy, Target, Calendar } from 'lucide-react'
import { Progress as ProgressType } from '@/types'

const Profile = () => {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<ProgressType>({
    completedLessonIds: [],
    quizStats: { correct: 0, total: 0 }
  })
  const [reminders, setReminders] = useState({
    daily: false,
    weekly: true
  })

  useEffect(() => {
    // Load progress from localStorage
    const completed = JSON.parse(localStorage.getItem('completedLessonIds') || '[]')
    const quizStats = JSON.parse(localStorage.getItem('quizStats') || '{"correct": 0, "total": 0}')
    const lastViewed = localStorage.getItem('lastViewedLessonId')
    
    setProgress({
      completedLessonIds: completed,
      lastViewedLessonId: lastViewed || undefined,
      quizStats
    })

    // Load reminder settings
    const savedReminders = JSON.parse(localStorage.getItem('reminderSettings') || '{"daily": false, "weekly": true}')
    setReminders(savedReminders)
  }, [])

  const updateReminders = (type: 'daily' | 'weekly', enabled: boolean) => {
    const newReminders = { ...reminders, [type]: enabled }
    setReminders(newReminders)
    localStorage.setItem('reminderSettings', JSON.stringify(newReminders))
  }

  const exportNotes = () => {
    // Collect all reflection notes from localStorage
    const allKeys = Object.keys(localStorage)
    const reflectionKeys = allKeys.filter(key => key.startsWith('reflection_'))
    
    let notesContent = '# My Learning Notes\n\n'
    
    reflectionKeys.forEach(key => {
      const lessonId = key.replace('reflection_', '')
      const notes = localStorage.getItem(key)
      if (notes) {
        notesContent += `## Lesson ${lessonId}\n\n${notes}\n\n---\n\n`
      }
    })

    // Create and download markdown file
    const blob = new Blob([notesContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'learning-notes.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getQuizAccuracy = () => {
    if (progress.quizStats.total === 0) return 0
    return Math.round((progress.quizStats.correct / progress.quizStats.total) * 100)
  }

  const getStreakDays = () => {
    // Mock streak calculation - in real app, this would track actual usage
    return Math.floor(Math.random() * 15) + 1
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
            <h1 className="text-xl font-semibold">My Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Progress Overview */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress.completedLessonIds.length}</div>
                <p className="text-xs text-muted-foreground">Keep learning!</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quiz Accuracy</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getQuizAccuracy()}%</div>
                <p className="text-xs text-muted-foreground">
                  {progress.quizStats.correct} of {progress.quizStats.total} correct
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getStreakDays()}</div>
                <p className="text-xs text-muted-foreground">days in a row</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Completion</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.completedLessonIds.length} lessons completed
                  </span>
                </div>
                <Progress value={(progress.completedLessonIds.length / Math.max(progress.completedLessonIds.length, 1)) * 100} />
              </div>

              {progress.completedLessonIds.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recently Completed</h4>
                  <div className="flex flex-wrap gap-2">
                    {progress.completedLessonIds.slice(-5).map((lessonId, index) => (
                      <Badge key={index} variant="secondary">
                        Lesson {lessonId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base">Daily Reminders</div>
                  <div className="text-sm text-muted-foreground">
                    Get notified every day to continue learning
                  </div>
                </div>
                <Switch
                  checked={reminders.daily}
                  onCheckedChange={(checked) => updateReminders('daily', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base">Weekly Reminders</div>
                  <div className="text-sm text-muted-foreground">
                    Weekly summary of your learning progress
                  </div>
                </div>
                <Switch
                  checked={reminders.weekly}
                  onCheckedChange={(checked) => updateReminders('weekly', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Export Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Export Your Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Download all your reflection notes and learning insights as a markdown file.
              </p>
              <Button onClick={exportNotes} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Notes (.md)
              </Button>
            </CardContent>
          </Card>

          {/* Achievement Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-sm font-medium">First Quiz</div>
                  <div className="text-xs text-muted-foreground">
                    {progress.quizStats.total > 0 ? 'Unlocked' : 'Take your first quiz'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-1">📚</div>
                  <div className="text-sm font-medium">First Lesson</div>
                  <div className="text-xs text-muted-foreground">
                    {progress.completedLessonIds.length > 0 ? 'Unlocked' : 'Complete your first lesson'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-sm font-medium">Week Streak</div>
                  <div className="text-xs text-muted-foreground">
                    {getStreakDays() >= 7 ? 'Unlocked' : `${7 - getStreakDays()} days to go`}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="text-sm font-medium">Quiz Master</div>
                  <div className="text-xs text-muted-foreground">
                    {getQuizAccuracy() >= 90 ? 'Unlocked' : 'Score 90%+ on quizzes'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Profile