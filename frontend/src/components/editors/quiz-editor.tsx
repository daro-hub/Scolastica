'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit3, Plus, Check, X, GripVertical } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface QuizQuestion {
  id: string
  type: 'true_false' | 'multiple_choice'
  question: string
  options?: string[]
  correctAnswer: string | number | boolean
}

export function QuizEditor() {
  const { rawOutput, setRawOutput } = useAppStore()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (rawOutput) {
      const parsed = parseQuizFromHtml(rawOutput)
      setQuestions(parsed)
    }
  }, [])

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
    regenerateHtml()
  }

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    regenerateHtml()
  }

  const addQuestion = (type: 'true_false' | 'multiple_choice') => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      type,
      question: type === 'true_false' ? 'Nuova affermazione vero/falso' : 'Nuova domanda a scelta multipla',
      options: type === 'multiple_choice' ? ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D'] : undefined,
      correctAnswer: type === 'true_false' ? true : 0,
    }
    setQuestions(prev => [...prev, newQuestion])
    setEditingId(newQuestion.id)
  }

  const regenerateHtml = () => {
    const html = generateQuizHtml(questions)
    setRawOutput(html)
  }

  return (
    <div className="quiz-editor">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          isEditing={editingId === question.id}
          onEdit={() => setEditingId(question.id)}
          onSave={() => { setEditingId(null); regenerateHtml() }}
          onCancel={() => setEditingId(null)}
          onUpdate={(updates) => updateQuestion(question.id, updates)}
          onDelete={() => deleteQuestion(question.id)}
        />
      ))}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button className="add-item-btn" onClick={() => addQuestion('true_false')} style={{ flex: 1 }}>
          <Plus size={18} />
          <span>Vero/Falso</span>
        </button>
        <button className="add-item-btn" onClick={() => addQuestion('multiple_choice')} style={{ flex: 1 }}>
          <Plus size={18} />
          <span>Scelta Multipla</span>
        </button>
      </div>
    </div>
  )
}

interface QuestionCardProps {
  question: QuizQuestion
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onUpdate: (updates: Partial<QuizQuestion>) => void
  onDelete: () => void
}

function QuestionCard({ 
  question, 
  index, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onUpdate, 
  onDelete 
}: QuestionCardProps) {
  const [localQuestion, setLocalQuestion] = useState(question.question)
  const [localOptions, setLocalOptions] = useState(question.options || [])
  const [localAnswer, setLocalAnswer] = useState(question.correctAnswer)

  useEffect(() => {
    setLocalQuestion(question.question)
    setLocalOptions(question.options || [])
    setLocalAnswer(question.correctAnswer)
  }, [question])

  const handleSave = () => {
    onUpdate({
      question: localQuestion,
      options: question.type === 'multiple_choice' ? localOptions : undefined,
      correctAnswer: localAnswer,
    })
    onSave()
  }

  return (
    <div className="editor-card">
      <div className="editor-card-header">
        <span className="editor-card-title">
          Domanda {index + 1} • {question.type === 'true_false' ? 'Vero/Falso' : 'Scelta Multipla'}
        </span>
        <div className="editor-card-actions">
          {isEditing ? (
            <>
              <button className="editor-card-btn" onClick={handleSave} title="Salva">
                <Check size={16} />
              </button>
              <button className="editor-card-btn" onClick={onCancel} title="Annulla">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button className="editor-card-btn" onClick={onEdit} title="Modifica">
                <Edit3 size={16} />
              </button>
              <button className="editor-card-btn danger" onClick={onDelete} title="Elimina">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-card-content">
        {isEditing ? (
          <>
            <textarea
              className="editor-input editor-textarea"
              value={localQuestion}
              onChange={(e) => setLocalQuestion(e.target.value)}
              placeholder="Scrivi la domanda..."
            />

            {question.type === 'true_false' ? (
              <div className="quiz-options">
                <div
                  className={`quiz-option ${localAnswer === true ? 'correct' : ''}`}
                  onClick={() => setLocalAnswer(true)}
                >
                  <div className="quiz-option-radio" />
                  <span className="quiz-option-text">Vero</span>
                </div>
                <div
                  className={`quiz-option ${localAnswer === false ? 'correct' : ''}`}
                  onClick={() => setLocalAnswer(false)}
                >
                  <div className="quiz-option-radio" />
                  <span className="quiz-option-text">Falso</span>
                </div>
              </div>
            ) : (
              <div className="quiz-options">
                {localOptions.map((option, i) => (
                  <div
                    key={i}
                    className={`quiz-option ${localAnswer === i ? 'correct' : ''}`}
                    onClick={() => setLocalAnswer(i)}
                  >
                    <div className="quiz-option-radio" />
                    <input
                      className="quiz-option-input"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...localOptions]
                        newOptions[i] = e.target.value
                        setLocalOptions(newOptions)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ marginBottom: '1rem', fontWeight: 500 }}>{question.question}</p>

            {question.type === 'true_false' ? (
              <div className="quiz-options">
                <div className={`quiz-option ${question.correctAnswer === true ? 'correct' : ''}`}>
                  <div className="quiz-option-radio" />
                  <span className="quiz-option-text">Vero</span>
                </div>
                <div className={`quiz-option ${question.correctAnswer === false ? 'correct' : ''}`}>
                  <div className="quiz-option-radio" />
                  <span className="quiz-option-text">Falso</span>
                </div>
              </div>
            ) : (
              <div className="quiz-options">
                {question.options?.map((option, i) => (
                  <div key={i} className={`quiz-option ${question.correctAnswer === i ? 'correct' : ''}`}>
                    <div className="quiz-option-radio" />
                    <span className="quiz-option-text">{String.fromCharCode(65 + i)}) {option}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function parseQuizFromHtml(html: string): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const questionDivs = doc.querySelectorAll('.question')
  
  questionDivs.forEach((div, index) => {
    const questionText = div.querySelector('strong')?.textContent || ''
    const options = div.querySelectorAll('.option')
    
    if (options.length === 0) {
      // True/False
      const isTrue = html.toLowerCase().includes(`${index + 1}. v`) || 
                     html.toLowerCase().includes(`${index + 1}: v`)
      questions.push({
        id: `q-${index}`,
        type: 'true_false',
        question: questionText,
        correctAnswer: isTrue,
      })
    } else {
      // Multiple choice
      const optionTexts: string[] = []
      options.forEach(opt => {
        const text = opt.textContent?.replace(/^[A-D]\)\s*/, '') || ''
        optionTexts.push(text)
      })
      
      questions.push({
        id: `q-${index}`,
        type: 'multiple_choice',
        question: questionText,
        options: optionTexts,
        correctAnswer: 0,
      })
    }
  })

  return questions.length > 0 ? questions : [
    { id: 'q-1', type: 'true_false', question: 'Domanda di esempio', correctAnswer: true }
  ]
}

function generateQuizHtml(questions: QuizQuestion[]): string {
  const tfQuestions = questions.filter(q => q.type === 'true_false')
  const mcQuestions = questions.filter(q => q.type === 'multiple_choice')

  let content = ''

  if (tfQuestions.length > 0) {
    content += '<h2>Domande Vero/Falso</h2>\n'
    tfQuestions.forEach((q, i) => {
      content += `<div class="question">
    <span class="question-number">${i + 1}</span>
    <strong>${q.question}</strong>
</div>\n`
    })
  }

  if (mcQuestions.length > 0) {
    content += '<h2>Domande a Scelta Multipla</h2>\n'
    mcQuestions.forEach((q, i) => {
      content += `<div class="question">
    <span class="question-number">${i + 1}</span>
    <strong>${q.question}</strong>
    <div class="options">
        ${q.options?.map((opt, j) => `<div class="option"><strong>${String.fromCharCode(65 + j)})</strong> ${opt}</div>`).join('\n        ')}
    </div>
</div>\n`
    })
  }

  // Answer key
  content += `<div class="answer-key">
    <h2>Risposte</h2>
    <p><strong>Vero/Falso:</strong> ${tfQuestions.map((q, i) => `${i + 1}. ${q.correctAnswer ? 'V' : 'F'}`).join(', ')}</p>
    <p><strong>Scelta Multipla:</strong> ${mcQuestions.map((q, i) => `${i + 1}. ${String.fromCharCode(65 + (q.correctAnswer as number))}`).join(', ')}</p>
</div>`

  return wrapInHtmlTemplate(content, 'Quiz', '#6366f1')
}

function wrapInHtmlTemplate(content: string, title: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 2rem; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: ${color}; color: white; padding: 2rem; text-align: center; }
        .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .content { padding: 2rem; }
        h2 { color: ${color}; border-bottom: 3px solid ${color}; padding-bottom: 0.5rem; margin: 2rem 0 1rem 0; }
        .question { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; margin: 1rem 0; }
        .question-number { display: inline-block; background: ${color}; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 0.75rem; }
        .options { margin-top: 1rem; padding-left: 2.5rem; }
        .option { padding: 0.5rem 0; }
        .answer-key { background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 12px; padding: 1.5rem; margin-top: 2rem; }
        .answer-key h2 { color: #2e7d32; border-color: #2e7d32; }
        .footer { text-align: center; padding: 1.5rem; background: #f5f5f5; color: #888; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>📝 ${title}</h1></div>
        <div class="content">${content}</div>
        <div class="footer">Generato con Scolastica</div>
    </div>
</body>
</html>`
}
