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
  ChevronRight, X, Eye, EyeOff, Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  // Generate the join URL for QR code
  const getJoinUrl = () => {
    if (!session) return '';
    // Use configured public URL when available (set VITE_PUBLIC_URL), otherwise use current origin
    const baseUrl = (import.meta.env.VITE_PUBLIC_URL as string) || window.location.origin;
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
      .single();

    if (sessionError || !sessionData) {
      toast.error('Session not found');
      navigate('/dashboard');
      return;
    }

    setSession(sessionData as QuizSession);

    // Fetch quiz
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', sessionData.quiz_id)
      .single();
    
    setQuiz(quizData as Quiz);

    // Fetch questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', sessionData.quiz_id)
      .order('order_index');
    
    setQuestions(questionsData as Question[] || []);

    // Fetch participants
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false });
    
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
                .sort((a, b) => b.total_score - a.total_score)
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
        current_question_index: 0
      })
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to start quiz');
    } else {
      const initialQuestion = questions[0];
      setSession({ ...session, status: 'active', current_question_index: 0 });
      setTimeLeft(initialQuestion?.time_limit || 30);
      setShowAnswer(false);
      // Close QR modal when quiz starts (participants should already be in)
      setShowQRModal(false);
    }
  };

  // Timer effect for auto-advancing questions
  useEffect(() => {
    if (session?.status !== 'active' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - show answer briefly then advance
          setShowAnswer(true);
          setTimeout(() => {
            nextQuestion();
          }, 3000); // Show answer for 3 seconds before advancing
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status, timeLeft, session?.current_question_index]);

  const nextQuestion = async () => {
    if (!session) return;
    const nextIndex = (session.current_question_index || 0) + 1;
    
    if (nextIndex >= questions.length) {
      await endQuiz();
      return;
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .update({ current_question_index: nextIndex })
      .eq('id', session.id);

    if (!error) {
      setSession({ ...session, current_question_index: nextIndex });
      setTimeLeft(questions[nextIndex]?.time_limit || 30);
      setShowAnswer(false);
    }
  };

  const endQuiz = async () => {
    if (!session) return;
    
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
      if (quiz) {
        await supabase
          .from('quizzes')
          .update({ play_count: quiz.play_count + 1 })
          .eq('id', quiz.id);
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
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display font-bold">{quiz.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={session.status === 'waiting' ? 'secondary' : session.status === 'active' ? 'default' : 'outline'}>
                  {session.status}
                </Badge>
                <span>•</span>
                <span>{questions.length} questions</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
              <Button onClick={endQuiz} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                End Quiz
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-8">
        {session.status === 'waiting' && (
          <div className="max-w-2xl mx-auto text-center">
            {/* PIN Display - using solid background instead of gradient */}
            <Card className="mb-8 border-2 border-border">
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
            <Card className="mb-8 border border-border">
              <CardContent className="py-6">
                <h3 className="font-display font-bold mb-4">
                  Players ({participants.length})
                </h3>
                {participants.length === 0 ? (
                  <p className="text-muted-foreground">Waiting for players to join...</p>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {participants.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-lg py-2 px-4 animate-bounce-in">
                        {p.avatar_emoji} {p.nickname}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              onClick={startQuiz} 
              disabled={participants.length === 0}
              size="lg"
              className="gradient-primary border-0 text-lg px-12"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Quiz
            </Button>
          </div>
        )}

        {session.status === 'active' && currentQuestion && (
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

            {/* Question Display - solid card background */}
            <Card className="mb-8 border border-border">
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
                      className={`p-4 rounded-xl border-2 text-center font-semibold transition-all break-words whitespace-normal overflow-hidden ${
                        showAnswer && (currentQuestion.correct_answers as string[]).includes(option)
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

            {/* Controls */}
            <div className="flex justify-center gap-4">
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
              <Button onClick={nextQuestion} size="lg" className="gradient-primary border-0">
                {(session.current_question_index || 0) + 1 >= questions.length ? (
                  <>
                    <Trophy className="h-5 w-5 mr-2" />
                    Show Results
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Live Leaderboard - solid card */}
            <Card className="mt-8 border border-border">
              <CardContent className="py-6">
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-secondary" />
                  Leaderboard
                </h3>
                <div className="space-y-2">
                  {participants.slice(0, 5).map((p, index) => (
                    <div 
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg w-6">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <span>{p.avatar_emoji} {p.nickname}</span>
                      </div>
                      <span className="font-bold text-primary">{p.total_score} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {session.status === 'completed' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-3xl font-bold mb-8">Quiz Complete!</h2>
            
            <Card className="mb-8 border border-border">
              <CardContent className="py-8">
                <h3 className="font-display text-xl font-bold mb-6 flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-secondary" />
                  Final Results
                </h3>
                <div className="space-y-3">
                  {participants.map((p, index) => (
                    <div 
                      key={p.id}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        index === 0 ? 'bg-secondary/20 border-2 border-secondary' :
                        index === 1 ? 'bg-muted border border-border' :
                        index === 2 ? 'bg-accent/10 border border-accent/30' :
                        'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-2xl w-10">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </span>
                        <span className="text-lg">{p.avatar_emoji} {p.nickname}</span>
                      </div>
                      <span className="font-bold text-xl text-primary">{p.total_score} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Link to="/dashboard">
              <Button size="lg" className="gradient-primary border-0">
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
