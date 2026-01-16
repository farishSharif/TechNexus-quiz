import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Users, BookOpen, TrendingUp, BarChart3, Trophy, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalUsers: number;
  totalQuizzes: number;
  totalSessions: number;
  totalPlays: number;
}

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
  session_id: string;
  host_id: string;
  completed_at: string;
  participant_count: number;
  leaderboard: LeaderboardEntry[];
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [completions, setCompletions] = useState<QuizCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchCompletions();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    const [usersRes, quizzesRes, sessionsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('quizzes').select('id, play_count'),
      supabase.from('quiz_sessions').select('id', { count: 'exact', head: true })
    ]);

    const totalPlays = quizzesRes.data?.reduce((sum, q) => sum + (q.play_count || 0), 0) || 0;

    setStats({
      totalUsers: usersRes.count || 0,
      totalQuizzes: quizzesRes.data?.length || 0,
      totalSessions: sessionsRes.count || 0,
      totalPlays
    });
    setLoading(false);
  };

  const fetchCompletions = async () => {
    const { data, error } = await supabase
      .from('quiz_completions')
      .select('*')
      .order('completed_at', { ascending: false });

    if (!error && data) {
      // Parse the leaderboard JSON for each completion
      const parsed = data.map(item => ({
        ...item,
        leaderboard: item.leaderboard as unknown as LeaderboardEntry[]
      }));
      setCompletions(parsed);
    }
  };

  if (authLoading || roleLoading) {
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
          <h1 className="font-display text-2xl font-bold mb-4">Sign in required</h1>
          <Link to="/auth">
            <Button size="lg" className="font-bold text-lg">Sign In</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
          <Link to="/dashboard" className="mt-4 inline-block">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border-b-4 border-primary/20">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center border-b-4 border-secondary/30">
                    <BookOpen className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Quizzes</p>
                    <p className="text-3xl font-bold">{stats.totalQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center border-b-4 border-accent/30">
                    <BarChart3 className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-3xl font-bold">{stats.totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center border-b-4 border-success/30">
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Plays</p>
                    <p className="text-3xl font-bold">{stats.totalPlays}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quiz Completions / Leaderboards */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" />
              Quiz Completion Leaderboards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No quiz completions yet. Leaderboards will appear here after quizzes are played.
              </p>
            ) : (
              <div className="space-y-6">
                {completions.map((completion) => (
                  <div key={completion.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-display font-bold text-lg">{completion.quiz_title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(completion.completed_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {completion.participant_count} players
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {completion.leaderboard.slice(0, 10).map((entry, index) => (
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Management Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View and manage user accounts, roles, and permissions.
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Quiz Moderation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Review public quizzes, feature content, and moderate submissions.
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}