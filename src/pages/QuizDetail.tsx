import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Quiz, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz';
import { generatePinCode } from '@/lib/generatePin';
import { toast } from 'sonner';
import {
  Play, Users, HelpCircle, ArrowLeft, Loader2, Clock
} from 'lucide-react';

export default function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchQuiz = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, questions(count)')
      .eq('id', quizId)
      .single();

    if (error || !data) {
      toast.error('Quiz not found');
      navigate('/browse');
      return;
    }

    setQuiz(data as Quiz);
    setQuestionCount((data as any).questions?.[0]?.count || 0);
    setLoading(false);
  };

  const handleStartQuiz = async () => {
    if (!user) {
      toast.error('Please sign in to host a quiz');
      navigate('/auth');
      return;
    }

    if (questionCount === 0) {
      toast.error('This quiz has no questions');
      return;
    }

    setStarting(true);

    const pinCode = generatePinCode();

    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        host_id: user.id,
        pin_code: pinCode,
        status: 'waiting',
        mode: 'live_hosted'
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create session');
      setStarting(false);
      return;
    }

    navigate(`/host/${session.id}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl">
        <Link to="/browse">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Button>
        </Link>

        <Card className="overflow-hidden">
          {/* Cover Image */}
          <div className="relative h-48 bg-primary/10">
            {quiz.cover_image_url ? (
              <img
                src={quiz.cover_image_url}
                alt={quiz.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-8xl">
                  {CATEGORY_ICONS[quiz.category]}
                </span>
              </div>
            )}
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                {CATEGORY_LABELS[quiz.category]}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              {quiz.title}
            </h1>

            {quiz.description && (
              <p className="text-muted-foreground mb-6">
                {quiz.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <HelpCircle className="h-4 w-4" />
                <span>{questionCount} questions</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{quiz.default_time_per_question}s per question</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{quiz.play_count} plays</span>
              </div>
            </div>

            <Button
              onClick={handleStartQuiz}
              className="w-full h-14 text-xl font-bold animate-pulse"
              size="lg"
              disabled={starting || questionCount === 0}
            >
              {starting ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <Play className="h-6 w-6 mr-2" />
              )}
              {user ? 'Host This Quiz 🎮' : 'Sign In to Host'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}