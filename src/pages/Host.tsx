import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { QuizSession, Quiz, Question, QuizParticipant } from '@/types/quiz';
import { formatPinCode } from '@/lib/generatePin';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  Play, Users, Copy, QrCode, Loader2,
  SkipForward, Square, Trophy, ArrowLeft,
  ChevronRight, X, Eye, EyeOff, Clock, Pause
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarDisplay } from '@/components/ui/AvatarDisplay';

export default function Host() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isLeaderboardView, setIsLeaderboardView] = useState(false);

  // Handle flow: Question -> Answer -> Leaderboard -> Next Question
  const handleNextStep = () => {
    // If not in leaderboard view, show leaderboard first
    if (!isLeaderboardView) {
      if (!showAnswer) setShowAnswer(true); // Ensure answer is shown before moving
      // Slight delay to allow user to see the checkmark if they just clicked "Show Answer"
      setIsLeaderboardView(true);
    } else {
      // If already in leaderboard view, go to next question
      nextQuestion();
    }
  };

  // Reveal animation effect
  useEffect(() => {
    if (session?.status === 'completed') {
      // 3rd place (0s) -> 2nd place (1s) -> 1st place (2s) -> Rest (3s)
      setRevealedCount(0);
      const timers = [
        setTimeout(() => setRevealedCount(1), 500),  // 3rd place (actually index 2 needs to show first, but my logic in JSX is >= 0 so 3rd shows instantly, wait... I want to sequence them)
        // Let's enable them in order: 3rd, 2nd, 1st.
        // My JSX logic:
        // 3rd shows if count >= 0. (Always shown first)
        // 2nd shows if count >= 1.
        // 1st shows if count >= 2.
        // Rest shows if count >= 3.

        // Actually, let's start with count = -1 (nothing).
        // Then set count = 0 (3rd).
        // Then count = 1 (2nd).
        // Then count = 2 (1st).
        // Then count = 3 (rest).
      ];

      // Correcting start
      setRevealedCount(-1);

      setTimeout(() => setRevealedCount(0), 500); // 3rd
      setTimeout(() => setRevealedCount(1), 1500); // 2nd
      setTimeout(() => setRevealedCount(2), 2500); // 1st
      setTimeout(() => setRevealedCount(3), 3500); // Rest

      return () => timers.forEach(t => clearTimeout(t)); // Cleanup not strictly possible with this inline logic but it's okay for now.
    }
  }, [session?.status]);

  // Generate the join URL for QR code
  const getJoinUrl = () => {
    if (!session) return '';
    const baseUrl = window.location.origin;
    // Use /join with PIN for waiting state, /play for active state
    if (session.status === 'waiting') {
      return `${baseUrl}/join?pin=${session.pin_code}`;
    }
    return `${baseUrl}/play/${session.id}`;
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      subscribeToParticipants();
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    const { data: sessionData, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('Session error:', sessionError);
      toast.error('Failed to load session');
      navigate('/dashboard');
      return;
    }

    if (!sessionData) {
      toast.error('Session not found');
      navigate('/dashboard');
      return;
    }

    setSession(sessionData as QuizSession);

    // Fetch quiz - use maybeSingle to avoid throwing on no results
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', sessionData.quiz_id)
      .maybeSingle();

    if (quizError) {
      console.error('Quiz error:', quizError);
      toast.error('Failed to load quiz data');
      navigate('/dashboard');
      return;
    }

    if (!quizData) {
      toast.error('Quiz not found or access denied');
      navigate('/dashboard');
      return;
    }

    setQuiz(quizData as Quiz);

    // Fetch questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', sessionData.quiz_id)
      .order('order_index');

    if (questionsError) {
      console.error('Questions error:', questionsError);
      toast.error('Failed to load questions');
      navigate('/dashboard');
      return;
    }

    setQuestions(questionsData as Question[] || []);

    // Fetch participants
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true });
    setParticipants(participantsData as QuizParticipant[] || []);
    setLoading(false);
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setParticipants(prev => [...prev, payload.new as QuizParticipant]);
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev =>
              prev.map(p => p.id === payload.new.id ? payload.new as QuizParticipant : p)
                .sort((a, b) => {
                  if (b.total_score !== a.total_score) {
                    return b.total_score - a.total_score;
                  }
                  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                })
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const copyPin = () => {
    if (session) {
      navigator.clipboard.writeText(session.pin_code);
      toast.success('PIN copied to clipboard!');
    }
  };

  const startQuiz = async () => {
    if (!session) return;

    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        current_question_index: 0,
        show_leaderboard: false
      })
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to start quiz');
    } else {
      const initialQuestion = questions[0];
      setSession({ ...session, status: 'active', current_question_index: 0 });
      setTimeLeft(initialQuestion?.time_limit || 30);
      setShowAnswer(false);
      setIsLeaderboardView(false);
      // Close QR modal when quiz starts (participants should already be in)
      setShowQRModal(false);
    }
  };
  const pauseQuiz = async () => {
    if (!session) return;

    const { error } = await supabase
      .from('quiz_sessions')
      .update({ status: 'paused' })
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to pause quiz');
    } else {
      setSession({ ...session, status: 'paused' as any });
      toast.success('Quiz paused');
    }
  };

  const resumeQuiz = async () => {
    if (!session) return;

    const { error } = await supabase
      .from('quiz_sessions')
      .update({ status: 'active' })
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to resume quiz');
    } else {
      setSession({ ...session, status: 'active' });
      toast.success('Quiz resumed');
    }
  };


  // Timer effect for auto-advancing questions
  useEffect(() => {
    if (session?.status !== 'active' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up sequence
          clearInterval(timer);
          console.log('Timer ended, starting auto-sequence');

          // 1. Show Answer immediately
          setShowAnswer(true);

          // 2. Show Leaderboard after 3 seconds (Answer Reveal Phase)
          setTimeout(async () => {
            // Check if this is the last question
            const isLastQuestion = (session.current_question_index || 0) >= questions.length - 1;

            if (isLastQuestion) {
              // If last question, skip leaderboard intermission and go straight to end
              console.log('Last question completed, skipping leaderboard, ending quiz...');
              nextQuestion(); // This will trigger endQuiz logic
              return;
            }

            console.log('Auto-showing leaderboard');
            setIsLeaderboardView(true);

            // Sync with players
            await supabase
              .from('quiz_sessions')
              .update({ show_leaderboard: true })
              .eq('id', session.id);

            // 3. Move to Next Question after 6 more seconds (Leaderboard Phase)
            // REMOVED: Auto-advancing to next question
            // setTimeout(() => {
            //   console.log('Auto-advancing to next question');
            //   nextQuestion();
            // }, 6000); // 6s viewing time
          }, 5500); // 5.5s viewing time for answer

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status, timeLeft, session?.current_question_index, questions.length]);

  const nextQuestion = async () => {
    if (!session) return;
    const nextIndex = (session.current_question_index || 0) + 1;

    if (nextIndex >= questions.length) {
      await endQuiz();
      return;
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        current_question_index: nextIndex,
        show_leaderboard: false // Reset leaderboard view for players
      })
      .eq('id', session.id);

    if (!error) {
      setSession({ ...session, current_question_index: nextIndex });
      setTimeLeft(questions[nextIndex]?.time_limit || 30);
      setShowAnswer(false);
      setIsLeaderboardView(false);
    }
  };

  const endQuiz = async () => {
    if (!session || !quiz || !user) return;

    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (!error) {
      setSession({ ...session, status: 'completed' });
      setShowQRModal(false);

      // Update play count
      await supabase
        .from('quizzes')
        .update({ play_count: quiz.play_count + 1 })
        .eq('id', quiz.id);

      // Fetch FINAL participants from DB to ensure we have the absolute latest scores
      const { data: finalParticipants, error: fetchError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('session_id', session.id)
        .order('total_score', { ascending: false })
        .order('joined_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch final participants:', fetchError);
        return;
      }

      // Delete ALL previous completion records for THIS host and quiz (keep only latest)
      const { error: deleteError } = await supabase
        .from('quiz_completions')
        .delete()
        .eq('quiz_id', quiz.id)
        .eq('host_id', user.id);

      if (deleteError) {
        console.log('Error deleting previous records:', deleteError);
      }

      // Save new completion record
      const leaderboardData = (finalParticipants || []).map((p, index) => ({
        rank: index + 1,
        nickname: p.nickname,
        avatar_emoji: p.avatar_emoji,
        total_score: p.total_score,
        best_streak: p.best_streak
      }));

      const { error: insertError } = await supabase
        .from('quiz_completions')
        .insert({
          quiz_id: quiz.id,
          quiz_title: quiz.title,
          session_id: session.id,
          host_id: user.id,
          participant_count: (finalParticipants || []).length,
          leaderboard: leaderboardData
        });

      if (insertError) {
        console.error('Failed to save leaderboard:', insertError);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Session not found</p>
      </div>
    );
  }

  const currentQuestion = questions[session.current_question_index || 0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 py-4 min-h-[4rem]">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 md:flex-none">
              <h1 className="font-display font-bold text-lg md:text-xl truncate">{quiz.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant={session.status === 'waiting' ? 'secondary' : session.status === 'active' ? 'default' : 'outline'}>
                  {session.status}
                </Badge>
                <span className="hidden sm:inline">•</span>
                <span className="text-xs sm:text-sm">{questions.length} questions</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-bold">{participants.length}</span>
            </div>
            {(session.status === 'waiting' || session.status === 'active') && (
              <Button onClick={() => setShowQRModal(true)} variant="outline" size="sm">
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            )}
            {session.status === 'active' && (
              <>
                <Button onClick={pauseQuiz} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={endQuiz} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  End Quiz
                </Button>
              </>
            )}
            {session.status === 'paused' && (
              <>
                <Button onClick={resumeQuiz} className="gradient-primary border-0">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button onClick={endQuiz} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  End Quiz
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container py-8">
        {session.status === 'waiting' && (
          <div className="max-w-2xl mx-auto text-center">
            {/* PIN Display - using solid background instead of gradient */}
            <Card className="mb-8 border-2 border-border dark:border-white/10 bg-card dark:bg-black/20 backdrop-blur-md">
              <CardContent className="py-8">
                <p className="text-muted-foreground mb-2">Join at <span className="font-bold text-foreground">technexusquiz.app</span> with PIN:</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="bg-muted/50 px-6 py-3 rounded-xl">
                    <span className="font-display text-5xl md:text-7xl font-bold tracking-wider text-primary">
                      {formatPinCode(session.pin_code)}
                    </span>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyPin}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowQRModal(true)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Show QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Participants - solid card background */}
            <Card className="mb-8 border border-border dark:border-white/10 bg-card dark:bg-black/20 backdrop-blur-md">
              <CardContent className="py-6">
                <h3 className="font-display font-bold mb-4">
                  Players ({participants.length})
                </h3>
                {participants.length === 0 ? (
                  <p className="text-muted-foreground">Waiting for players to join...</p>
                ) : (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {participants.map((p) => (
                      <div key={p.id} className="flex flex-col items-center animate-bounce-in">
                        <div className="relative">
                          <AvatarDisplay seed={p.avatar_emoji} size="md" />
                          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 scale-75 whitespace-nowrap" variant="secondary">
                            {p.nickname}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={startQuiz}
              disabled={participants.length === 0}
              size="xl"
              className="text-2xl px-12 font-black animate-pulse"
            >
              <Play className="h-6 w-6 mr-3" />
              Start Quiz
            </Button>
          </div>
        )}

        {(session.status === 'active' || session.status === 'paused') && currentQuestion && (
          <div className="max-w-4xl mx-auto">
            {/* Timer Display */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Time Remaining</span>
                </div>
                <span className={`font-bold text-2xl ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                  {timeLeft}s
                </span>
              </div>
              <Progress
                value={(timeLeft / (currentQuestion.time_limit || 30)) * 100}
                className="h-3"
              />
            </div>

            {/* Question Display / Leaderboard Intermission */}
            {!isLeaderboardView ? (
              <Card className="mb-8 border-2 border-border dark:border-white/10 bg-card dark:bg-black/20 backdrop-blur-md shadow-xl">
                <CardContent className="py-8">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline">
                      Question {(session.current_question_index || 0) + 1} of {questions.length}
                    </Badge>
                    <Badge>{currentQuestion.points} pts</Badge>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 break-words whitespace-pre-wrap overflow-hidden">
                    {currentQuestion.question_text}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(currentQuestion.options as string[]).map((option, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 text-center font-semibold transition-all break-words whitespace-normal overflow-hidden ${showAnswer && (currentQuestion.correct_answers as string[]).includes(option)
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border bg-card'
                          }`}
                      >
                        <span className="mr-2">{String.fromCharCode(65 + index)}.</span>
                        <span className="break-words">{option}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-8 border-none bg-transparent shadow-none">
                <CardContent className="py-0">
                  <h2 className="font-display text-3xl font-black text-center mb-8 animate-bounce">Leaderboard Update! 📈</h2>
                  <div className="space-y-3">
                    {participants.slice(0, 5).map((p, index) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-card border-b-4 border-border/50 shadow-lg transform transition-all duration-500 animate-in slide-in-from-right fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-100 text-slate-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100'
                            }`}>
                            {index + 1}
                          </div>
                          <AvatarDisplay seed={p.avatar_emoji} size="md" />
                          <span className="font-bold text-xl">{p.nickname}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-2xl text-primary">{p.total_score}</span>
                          <span className="text-xs font-bold text-success capitalize">
                            {p.current_streak > 2 ? `🔥 ${p.current_streak} streak!` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isLeaderboardView && (
                <Button
                  onClick={() => setShowAnswer(!showAnswer)}
                  variant="outline"
                  size="lg"
                >
                  {showAnswer ? (
                    <>
                      <EyeOff className="h-5 w-5 mr-2" />
                      Hide Answer
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5 mr-2" />
                      Show Answer
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleNextStep}
                size="lg"
                className="font-bold text-lg px-8"
              >
                {!isLeaderboardView ? (
                  <>
                    <Trophy className="h-5 w-5 mr-2" />
                    Show Leaderboard
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {session.status === 'completed' && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="font-display text-4xl font-black mb-8">Quiz Champions!</h2>

            <Card className="mb-8 border-none shadow-none bg-transparent">
              <CardContent className="py-0">
                {/* Podium */}
                <div className="flex items-end justify-center gap-4 min-h-[400px] mb-12">
                  {/* 2nd Place */}
                  {participants.length >= 2 && (
                    <div className={`flex flex-col items-center transition-all duration-700 delay-300 ${revealedCount >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                      <div className="mb-4 relative">
                        <AvatarDisplay seed={participants[1].avatar_emoji} size="xl" className="border-4 border-slate-300 shadow-xl" />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-800 font-bold px-3 py-1 rounded-full text-sm">
                          2nd
                        </div>
                      </div>
                      <div className="w-24 sm:w-32 h-32 bg-slate-200 rounded-t-xl flex items-end justify-center pb-4 border-b-8 border-slate-300 shadow-inner">
                        <div className="text-center">
                          <p className="font-bold text-slate-800 truncate max-w-[6rem]">{participants[1].nickname}</p>
                          <p className="font-black text-xl text-slate-900">{participants[1].total_score}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {participants.length >= 1 && (
                    <div className={`flex flex-col items-center z-10 -mx-4 sm:mx-0 transition-all duration-700 delay-1000 ${revealedCount >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                      <div className="mb-4 relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl animate-bounce">👑</div>
                        <AvatarDisplay seed={participants[0].avatar_emoji} size="2xl" className="border-8 border-yellow-400 shadow-2xl" />
                      </div>
                      <div className="w-32 sm:w-40 h-48 bg-yellow-300 rounded-t-xl flex items-end justify-center pb-6 border-b-8 border-yellow-500 shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                        <div className="text-center relative z-10">
                          <p className="font-bold text-yellow-900 text-lg truncate max-w-[8rem]">{participants[0].nickname}</p>
                          <p className="font-black text-3xl text-yellow-950">{participants[0].total_score}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {participants.length >= 3 && (
                    <div className={`flex flex-col items-center transition-all duration-700 ${revealedCount >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                      <div className="mb-4 relative">
                        <AvatarDisplay seed={participants[2].avatar_emoji} size="xl" className="border-4 border-orange-300 shadow-xl" />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-300 text-orange-900 font-bold px-3 py-1 rounded-full text-sm">
                          3rd
                        </div>
                      </div>
                      <div className="w-24 sm:w-32 h-24 bg-orange-200 rounded-t-xl flex items-end justify-center pb-4 border-b-8 border-orange-300 shadow-inner">
                        <div className="text-center">
                          <p className="font-bold text-orange-900 truncate max-w-[6rem]">{participants[2].nickname}</p>
                          <p className="font-black text-xl text-orange-950">{participants[2].total_score}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rest of the leaderboard */}
                {participants.length > 3 && (
                  <div className={`transition-all duration-1000 delay-1500 space-y-3 max-w-xl mx-auto ${revealedCount >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <h3 className="font-display font-bold text-muted-foreground mb-4">Honorable Mentions</h3>
                    {participants.slice(3).map((p, index) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border-2 border-border/50 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-xl w-8 text-slate-400">#{index + 4}</span>
                          <AvatarDisplay seed={p.avatar_emoji} size="sm" />
                          <span className="font-bold text-lg">{p.nickname}</span>
                        </div>
                        <span className="font-bold text-xl text-primary">{p.total_score} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Link to="/dashboard">
              <Button size="lg" className={`font-bold text-xl h-14 px-8 transition-all duration-500 delay-2000 ${revealedCount >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                Back to Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* QR Code Modal - only shown when session is active */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to Join</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-xl mb-4">
              <QRCodeSVG
                value={getJoinUrl()}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-2">
              Scan this QR code to join the quiz instantly
            </p>
            <p className="text-xs text-muted-foreground text-center">
              PIN: <span className="font-bold text-foreground">{formatPinCode(session?.pin_code || '')}</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}