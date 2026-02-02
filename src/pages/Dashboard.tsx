import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Quiz, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz';
import { generatePinCode, formatPinCode } from '@/lib/generatePin';
import { generateQuizPDF } from '@/lib/generateQuizPDF';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus, Play, Edit, Trash2, Users, Copy, QrCode,
  Loader2, LayoutDashboard, BarChart3, Trophy, Clock, Download
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarDisplay } from '@/components/ui/AvatarDisplay';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  avatar_emoji: string;
  total_score: number;
  best_streak: number;
}

interface QuizCompletion {
  id: string;
  quiz_id: string;
  session_id: string;
  quiz_title: string;
  completed_at: string;
  participant_count: number;
  leaderboard: LeaderboardEntry[];
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<(Quiz & { question_count: number; last_participant_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostDialogOpen, setHostDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [sessionMode, setSessionMode] = useState<'live_hosted' | 'self_paced'>('live_hosted');
  const [creatingSession, setCreatingSession] = useState(false);
  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState<QuizCompletion | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [selectedQuizForLeaderboard, setSelectedQuizForLeaderboard] = useState<Quiz | null>(null);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, questions(count)')
      .eq('creator_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      setLoading(false);
      return;
    }

    // Fetch latest completion for each quiz to get participant counts
    const { data: completions } = await supabase
      .from('quiz_completions')
      .select('quiz_id, participant_count')
      .eq('host_id', user!.id)
      .order('completed_at', { ascending: false });
    // Create a map of quiz_id to latest participant_count
    const participantMap = new Map<string, number>();
    completions?.forEach(c => {
      if (!participantMap.has(c.quiz_id)) {
        participantMap.set(c.quiz_id, c.participant_count);
      }
    });
    const quizzesWithCount = data.map((quiz: any) => ({
      ...quiz,
      question_count: quiz.questions?.[0]?.count || 0,
      last_participant_count: participantMap.get(quiz.id)
    }));
    setQuizzes(quizzesWithCount);
    setLoading(false);
  };

  const handleDelete = async (quizId: string) => {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      toast.error('Failed to delete quiz');
    } else {
      toast.success('Quiz deleted');
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    }
  };

  const openHostDialog = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setHostDialogOpen(true);
  };

  const openLeaderboard = async (quiz: Quiz) => {
    setSelectedQuizForLeaderboard(quiz);
    setLoadingLeaderboard(true);
    setLeaderboardDialogOpen(true);

    const { data, error } = await supabase
      .from('quiz_completions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('host_id', user!.id) // Ensure we only see results from THIS host
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error('Failed to load leaderboard');
      setLeaderboardDialogOpen(false);
    } else if (data) {
      setSelectedCompletion({
        ...data,
        leaderboard: data.leaderboard as unknown as LeaderboardEntry[]
      });
    } else {
      setSelectedCompletion(null);
    }
    setLoadingLeaderboard(false);
  };
  const downloadPDF = async () => {
    if (!selectedCompletion) return;

    setDownloadingPDF(true);

    try {
      // Fetch questions for the quiz
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', selectedCompletion.quiz_id)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      // Fetch participants for the session
      const { data: participants, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('session_id', selectedCompletion.session_id)
        .order('total_score', { ascending: false });

      if (participantsError) throw participantsError;

      // Fetch responses for the session
      const { data: responses, error: responsesError } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('session_id', selectedCompletion.session_id);

      if (responsesError) throw responsesError;

      // Generate PDF
      generateQuizPDF({
        quizTitle: selectedCompletion.quiz_title,
        completedAt: selectedCompletion.completed_at,
        participantCount: selectedCompletion.participant_count,
        questions: questions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options as string[],
          correct_answers: q.correct_answers as string[],
          points: q.points,
          time_limit: q.time_limit,
          order_index: q.order_index
        })),
        participants: participants.map(p => ({
          id: p.id,
          nickname: p.nickname,
          avatar_emoji: p.avatar_emoji || '😀',
          total_score: p.total_score,
          best_streak: p.best_streak
        })),
        responses: responses.map(r => ({
          participant_id: r.participant_id,
          question_id: r.question_id,
          selected_answers: r.selected_answers as string[],
          is_correct: r.is_correct,
          points_earned: r.points_earned,
          response_time_ms: r.response_time_ms
        }))
      });

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const createSession = async () => {
    if (!selectedQuiz || !user) return;

    setCreatingSession(true);
    const pinCode = generatePinCode();

    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: selectedQuiz.id,
        host_id: user.id,
        pin_code: pinCode,
        mode: sessionMode,
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create session');
      setCreatingSession(false);
      return;
    }

    setHostDialogOpen(false);
    navigate(`/host/${session.id}`);
  };

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
          <h1 className="font-display text-2xl font-bold mb-4">Sign in to access your dashboard</h1>
          <Link to="/auth">
            <Button className="gradient-primary border-0">Sign In</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Manage your quizzes and sessions</p>
          </div>
          <Link to="/create">
            <Button className="font-bold text-lg btn-3d-primary" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create New Quiz
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card dark:bg-black/40 border-border dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-none">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{quizzes.length}</div>
              <p className="text-muted-foreground">Total Quizzes</p>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-black/40 border-border dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-none">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-foreground">
                {quizzes.reduce((sum, q) => sum + q.question_count, 0)}
              </div>
              <p className="text-muted-foreground">Total Questions</p>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-black/40 border-border dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-none">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-accent">
                {quizzes.reduce((sum, q) => sum + q.play_count, 0)}
              </div>
              <p className="text-muted-foreground">Total Plays</p>
            </CardContent>
          </Card>
        </div>

        {/* Quizzes */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Quizzes</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quizzes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't created any quizzes yet</p>
                <Link to="/create">
                  <Button size="lg" className="font-bold">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 border-b-4 border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-md transition-all text-card-foreground"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-2xl">
                      {CATEGORY_ICONS[quiz.category]}
                    </div>
                    <div>
                      <h3 className="font-semibold">{quiz.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Badge variant="outline" className="whitespace-nowrap">{CATEGORY_LABELS[quiz.category]}</Badge>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">{quiz.question_count} questions</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">{quiz.play_count} plays</span>
                        {quiz.last_participant_count !== undefined && (
                          <>
                            <span className='hidden sm:inline'>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {quiz.last_participant_count} last session
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => openHostDialog(quiz)}
                      className="flex-1 sm:flex-none font-bold min-w-[120px]"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Host
                    </Button>
                    <Link to={`/edit/${quiz.id}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => openLeaderboard(quiz)}
                      title="View Leaderboard"
                      className="flex-1 sm:flex-none"
                    >
                      <Trophy className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive hover:text-destructive flex-1 sm:flex-none">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{quiz.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(quiz.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Host Session Dialog */}
      <Dialog open={hostDialogOpen} onOpenChange={setHostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Quiz Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Session Mode</Label>
              <Select value={sessionMode} onValueChange={(v) => setSessionMode(v as 'live_hosted' | 'self_paced')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live_hosted">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Live Hosted</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="self_paced">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Self-Paced</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {sessionMode === 'live_hosted'
                  ? 'You control the quiz progression. All players answer together.'
                  : 'Players progress through the quiz at their own pace.'}
              </p>
            </div>
            <Button onClick={createSession} disabled={creatingSession} className="w-full text-lg font-bold h-12" size="lg">
              {creatingSession ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
              Start Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Dialog */}
      <Dialog open={leaderboardDialogOpen} onOpenChange={setLeaderboardDialogOpen}>
        <DialogContent className="max-w-md bg-card dark:bg-black/95 border-border dark:border-white/10 backdrop-blur-xl h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Trophy className="h-6 w-6 text-yellow-500 animate-bounce-subtle" />
              {selectedQuizForLeaderboard?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-0">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedCompletion ? (
              <div className="flex flex-col h-full">
                <div className="px-6 mb-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 text-sm">
                    <span className="flex items-center gap-2 font-bold">
                      <Clock className="h-4 w-4 text-primary" />
                      {format(new Date(selectedCompletion.completed_at), 'MMM d, h:mm a')}
                    </span>
                    <span className="flex items-center gap-2 font-bold">
                      <Users className="h-4 w-4 text-primary" />
                      {selectedCompletion.participant_count} players
                    </span>
                  </div>
                </div>

                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-3 pb-6">
                    {selectedCompletion.leaderboard.slice(0, 50).map((entry, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-xl border-b-4 transition-all hover:scale-[1.02] ${index === 0
                          ? 'bg-yellow-100/50 dark:bg-yellow-500/10 border-yellow-400/50 text-yellow-900 dark:text-yellow-100'
                          : index === 1
                            ? 'bg-slate-100/50 dark:bg-slate-400/10 border-slate-300/50'
                            : index === 2
                              ? 'bg-orange-100/50 dark:bg-orange-400/10 border-orange-300/50'
                              : 'bg-muted/30 border-border/50'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-slate-300 text-slate-800' :
                              index === 2 ? 'bg-orange-300 text-orange-900' :
                                'bg-background/50'
                            }`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <AvatarDisplay seed={entry.avatar_emoji} size="sm" />
                            <div className="flex flex-col">
                              <span className="font-bold leading-tight">{entry.nickname}</span>
                              {entry.best_streak > 2 && (
                                <span className="text-[10px] font-black text-success uppercase">
                                  🔥 {entry.best_streak} Max Streak
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="font-black text-xl text-primary">{entry.total_score}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-6 pt-2 bg-card dark:bg-black/95 border-t border-border/50">
                  <Button
                    onClick={downloadPDF}
                    disabled={downloadingPDF}
                    className="w-full gradient-primary border-0 h-12 text-lg font-bold"
                  >
                    {downloadingPDF ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Download className="h-5 w-5 mr-2" />
                    )}
                    Download Full Report (PDF)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center space-y-4">
                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-lg">No Results Yet</p>
                  <p className="text-sm text-muted-foreground">Complete a host session to see the leaderboard here.</p>
                </div>
                <Button
                  onClick={() => {
                    setLeaderboardDialogOpen(false);
                    if (selectedQuizForLeaderboard) openHostDialog(selectedQuizForLeaderboard);
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Host Now
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout >
  );
}