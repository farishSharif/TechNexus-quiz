import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuizCategory, QuestionType, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz';
import { Plus, Trash2, GripVertical, Save, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuestionForm {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answers: string[];
  time_limit: number;
  points: number;
}

const createEmptyQuestion = (timeLimit: number = 30): QuestionForm => ({
  id: crypto.randomUUID(),
  question_text: '',
  question_type: 'multiple_choice_single',
  options: ['', '', '', ''],
  correct_answers: [],
  time_limit: timeLimit,
  points: 100
});

export default function Create() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuizCategory>('technology');
  const [isPublic, setIsPublic] = useState(false);
  const [defaultTime, setDefaultTime] = useState(30);
  const [questions, setQuestions] = useState<QuestionForm[]>([createEmptyQuestion()]);
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Sign in to create quizzes</h1>
          <Link to="/auth">
            <Button className="gradient-primary border-0">Sign In</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion(defaultTime)]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, updates: Partial<QuestionForm>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const toggleCorrectAnswer = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const optionValue = q.options[optionIndex];
        const isCurrentlyCorrect = q.correct_answers.includes(optionValue);
        
        if (q.question_type === 'multiple_choice_single') {
          return { ...q, correct_answers: isCurrentlyCorrect ? [] : [optionValue] };
        } else {
          return {
            ...q,
            correct_answers: isCurrentlyCorrect
              ? q.correct_answers.filter(a => a !== optionValue)
              : [...q.correct_answers, optionValue]
          };
        }
      }
      return q;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }
    
    if (questions.some(q => !q.question_text.trim())) {
      toast.error('All questions must have text');
      return;
    }
    
    if (questions.some(q => q.correct_answers.length === 0)) {
      toast.error('All questions must have at least one correct answer');
      return;
    }

    setSaving(true);

    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        is_public: isPublic,
        default_time_per_question: defaultTime
      })
      .select()
      .single();

    if (quizError) {
      toast.error('Failed to create quiz');
      setSaving(false);
      return;
    }

    // Create questions
    const questionsToInsert = questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_text: q.question_text.trim(),
      question_type: q.question_type,
      options: q.options.filter(o => o.trim()),
      correct_answers: q.correct_answers,
      time_limit: q.time_limit,
      points: q.points,
      order_index: index
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      toast.error('Failed to save questions');
      // Delete the quiz if questions failed
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      setSaving(false);
      return;
    }

    toast.success('Quiz created successfully!');
    navigate('/dashboard');
  };

  return (
    <MainLayout hideFooter>
      <div className="container py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-display text-2xl font-bold">Create Quiz</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Quiz
          </Button>
        </div>

        {/* Quiz Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter quiz title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as QuizCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {CATEGORY_ICONS[key as QuizCategory]} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your quiz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                <Label>Make quiz public</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Default time:</Label>
                <Select value={defaultTime.toString()} onValueChange={(v) => {
                  const newTime = parseInt(v);
                  setDefaultTime(newTime);
                  // Apply to all questions
                  setQuestions(questions.map(q => ({ ...q, time_limit: newTime })));
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 30, 45, 60].map(t => (
                      <SelectItem key={t} value={t.toString()}>{t}s</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Questions ({questions.length})</h2>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.map((question, qIndex) => (
            <Card key={question.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                    <span className="font-bold text-lg">{qIndex + 1}</span>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Enter your question"
                          value={question.question_text}
                          onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                          className="text-lg font-medium"
                        />
                      </div>
                      <Select
                        value={question.question_type}
                        onValueChange={(v) => updateQuestion(question.id, { 
                          question_type: v as QuestionType,
                          correct_answers: [],
                          options: v === 'true_false' ? ['True', 'False'] : question.options
                        })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice_single">Single Choice</SelectItem>
                          <SelectItem value="multiple_choice_multiple">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCorrectAnswer(question.id, oIndex)}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                              question.correct_answers.includes(option) && option
                                ? 'bg-success text-success-foreground border-success'
                                : 'border-border hover:border-primary'
                            }`}
                          >
                            {String.fromCharCode(65 + oIndex)}
                          </button>
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                            value={option}
                            onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                            disabled={question.question_type === 'true_false'}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Question Settings */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground">Time:</Label>
                        <Select 
                          value={question.time_limit.toString()} 
                          onValueChange={(v) => updateQuestion(question.id, { time_limit: parseInt(v) })}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[5, 10, 15, 20, 30, 45, 60].map(t => (
                              <SelectItem key={t} value={t.toString()}>{t}s</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground">Points:</Label>
                        <Select 
                          value={question.points.toString()} 
                          onValueChange={(v) => updateQuestion(question.id, { points: parseInt(v) })}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[50, 100, 150, 200, 500, 1000].map(p => (
                              <SelectItem key={p} value={p.toString()}>{p} pts</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length === 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addQuestion} variant="outline" className="w-full h-14 border-dashed">
            <Plus className="h-5 w-5 mr-2" />
            Add Another Question
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
