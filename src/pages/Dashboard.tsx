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
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus, Play, Edit, Trash2, Users, Copy, QrCode,
  Loader2, LayoutDashboard, BarChart3, Trophy, Clock
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
  quiz_title: string;
  completed_at: string;
  participant_count: number;
  leaderboard: LeaderboardEntry[];
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<(Quiz & { question_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostDialogOpen, setHostDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [sessionMode, setSessionMode] = useState<'live_hosted' | 'self_paced'>('live_hosted');
  const [creatingSession, setCreatingSession] = useState(false);
  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState<QuizCompletion | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

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
    } else {
      const quizzesWithCount = data.map((quiz: any) => ({
        ...quiz,
        question_count: quiz.questions?.[0]?.count || 0
      }));
      setQuizzes(quizzesWithCount);
    }
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

  const openLeaderboard = async (quizId: string) => {
    setLoadingLeaderboard(true);
    setLeaderboardDialogOpen(true);

    const { data, error } = await supabase
      .from('quiz_completions')
      .select('*')
      .eq('quiz_id', quizId)
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
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{quizzes.length}</div>
              <p className="text-muted-foreground">Total Quizzes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-secondary">
                {quizzes.reduce((sum, q) => sum + q.question_count, 0)}
              </div>
              <p className="text-muted-foreground">Total Questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-accent">
                {quizzes.reduce((sum, q) => sum + q.play_count, 0)}
              </div>
              <p className="text-muted-foreground">Total Plays</p>
            </CardContent>
          </Card>
        </div>

        {/* Quizzes */}
        <Card>
          <CardHeader>
            <CardTitle>My Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't created any quizzes yet</p>
                <Link to="/create">
                  <Button size="lg" className="font-bold">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 border-b-4 border-gray-100 bg-white hover:border-primary/20 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-2xl">
                        {CATEGORY_ICONS[quiz.category]}
                      </div>
                      <div>
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{CATEGORY_LABELS[quiz.category]}</Badge>
                          <span>•</span>
                          <span>{quiz.question_count} questions</span>
                          <span>•</span>
                          <span>{quiz.play_count} plays</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => openHostDialog(quiz)}
                        className="flex-1 sm:flex-none font-bold"
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
                        onClick={() => openLeaderboard(quiz.id)}
                        title="View Leaderboard"
                      >
                        <Trophy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-destructive hover:text-destructive">
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
          </CardContent>
        </Card>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Quiz Leaderboard
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedCompletion ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedCompletion.completed_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedCompletion.participant_count} players
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedCompletion.leaderboard.slice(0, 10).map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-secondary/20 border border-secondary/50' :
                        index === 1 ? 'bg-muted' :
                          index === 2 ? 'bg-accent/10' :
                            'bg-muted/50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg w-8">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <span>{entry.avatar_emoji} {entry.nickname}</span>
                      </div>
                      <span className="font-bold text-primary">{entry.total_score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No leaderboard data yet.</p>
                <p className="text-sm">Complete a quiz session to see results here.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}