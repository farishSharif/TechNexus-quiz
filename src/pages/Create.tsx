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
import { Plus, Save, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QuestionEditor } from '@/components/quiz/QuestionEditor';

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
            <Button size="lg" className="font-bold">Sign In</Button>
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
      <div className="container py-4 sm:py-6 max-w-4xl px-3 sm:px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-display text-xl sm:text-2xl font-bold truncate">Create Quiz</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" variant="success" className="shrink-0 text-lg font-bold">
            {saving ? <Loader2 className="h-5 w-5 animate-spin sm:mr-2" /> : <Save className="h-5 w-5 sm:mr-2" />}
            <span className="hidden sm:inline">Save Quiz</span>
          </Button>
        </div>

        {/* Quiz Details */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter quiz title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as QuizCategory)}>
                  <SelectTrigger className="h-10">
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

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                <Label>Make quiz public</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Default time:</Label>
                <Select value={defaultTime.toString()} onValueChange={(v) => {
                  const newTime = parseInt(v);
                  setDefaultTime(newTime);
                  // Apply to all questions
                  setQuestions(questions.map(q => ({ ...q, time_limit: newTime })));
                }}>
                  <SelectTrigger className="w-24 h-10">
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg sm:text-xl font-bold">Questions ({questions.length})</h2>
            <Button onClick={addQuestion} variant="outline" size="sm" className="sm:size-default">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Question</span>
            </Button>
          </div>

          {questions.map((question, qIndex) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={qIndex}
              onUpdate={updateQuestion}
              onUpdateOption={updateOption}
              onToggleCorrectAnswer={toggleCorrectAnswer}
              onRemove={removeQuestion}
              canRemove={questions.length > 1}
            />
          ))}

          <Button onClick={addQuestion} variant="outline" className="w-full h-12 sm:h-14 border-dashed">
            <Plus className="h-5 w-5 mr-2" />
            Add Another Question
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}