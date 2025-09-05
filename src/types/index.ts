export type Lesson = {
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

export type Course = {
  topic: string
  lessons: Lesson[]
  overview: { tlDr: string, totalDurationMin: number, lessonCount: number }
}

export type VideoCandidate = {
  videoId: string
  title: string
  channel: string
  views: number
  duration: string
  description: string
}

export type Progress = {
  completedLessonIds: string[]
  lastViewedLessonId?: string
  quizStats: { correct: number, total: number }
}