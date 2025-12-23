import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { QuizSession, Quiz, Question, QuizParticipant } from '@/types/quiz';
import { toast } from 'sonner';
import { Loader2, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function Play() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<QuizSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participant, setParticipant] = useState<QuizParticipant | null>(null);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number } | null>(null);

  const participantId = localStorage.getItem('participantId');

  useEffect(() => {
    if (sessionId) {
      // Check if we have a participant ID, if not redirect to join with session info
      if (!participantId) {
        checkSessionAndRedirect();
      } else {
        fetchData();
        subscribeToSession();
      }
    }
  }, [sessionId, participantId]);

  const checkSessionAndRedirect = async () => {
    const { data: sessionData } = await supabase
      .from('quiz_sessions')
      .select('id, status, pin_code')
      .eq('id', sessionId)
      .single();
    
    if (!sessionData) {
      toast.error('Session not found');
      navigate('/join');
      return;
    }
    
    if (sessionData.status === 'completed' || sessionData.status === 'cancelled') {
      toast.error('This quiz session has ended');
      navigate('/join');
      return;
    }
    
    // Redirect to join page with PIN pre-filled
    navigate(`/join?pin=${sessionData.pin_code}`);
  };

  useEffect(() => {
    if (session?.status === 'active' && !hasAnswered && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [session?.status, session?.current_question_index, hasAnswered, timeLeft]);

  const fetchData = async () => {
    // Fetch session
    const { data: sessionData } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!sessionData) {
      toast.error('Session not found');
      navigate('/join');
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

    // Fetch participant
    const { data: participantData } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('id', participantId)
      .single();
    setParticipant(participantData as QuizParticipant);

    // Fetch all participants for leaderboard
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false });
    setParticipants(participantsData as QuizParticipant[] || []);

    setLoading(false);
  };

  const subscribeToSession = () => {
    const channel = supabase
      .channel(`play-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const newSession = payload.new as QuizSession;
          
          // Reset state for new question when question index changes
          setSession(prevSession => {
            if (newSession.current_question_index !== prevSession?.current_question_index) {
              // Use functional updates to avoid stale closure issues
              setSelectedAnswers([]);
              setHasAnswered(false);
              setShowResult(false);
              setLastResult(null);
              
              // Need to update questions state to get correct time limit
              supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', newSession.quiz_id)
                .order('order_index')
                .then(({ data }) => {
                  if (data) {
                    const newQuestion = data[newSession.current_question_index || 0];
                    setTimeLeft(newQuestion?.time_limit || 30);
                  }
                });
            }
            return newSession;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Refresh participants
          supabase
            .from('quiz_participants')
            .select('*')
            .eq('session_id', sessionId)
            .order('total_score', { ascending: false })
            .then(({ data }) => {
              if (data) setParticipants(data as QuizParticipant[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTimeUp = () => {
    if (!hasAnswered) {
      submitAnswer([]);
    }
  };

  const selectAnswer = (option: string) => {
    if (hasAnswered) return;
    
    const currentQuestion = questions[session?.current_question_index || 0];
    if (currentQuestion.question_type === 'multiple_choice_single' || currentQuestion.question_type === 'true_false') {
      // Auto-submit for single choice and true/false questions
      setSelectedAnswers([option]);
      submitAnswer([option]);
    } else {
      setSelectedAnswers(prev => 
        prev.includes(option) 
          ? prev.filter(a => a !== option)
          : [...prev, option]
      );
    }
  };

  const submitAnswer = async (answers: string[] = selectedAnswers) => {
    if (!session || !participant) return;
    
    setHasAnswered(true);
    const currentQuestion = questions[session.current_question_index || 0];
    const correctAnswers = currentQuestion.correct_answers as string[];
    
    // Check if answer is correct
    const isCorrect = answers.length > 0 && 
      answers.length === correctAnswers.length &&
      answers.every(a => correctAnswers.includes(a));
    
    // Calculate points based on reaction time
    // Faster = more points (up to 2x base points for instant answers)
    const basePoints = currentQuestion.points;
    const timeRatio = timeLeft / currentQuestion.time_limit; // 1.0 = instant, 0 = time ran out
    
    // Points formula: base + (base * timeRatio) = up to 2x points for fastest answers
    // Minimum 50% of base points if answered correctly but slowly
    const reactionMultiplier = 0.5 + (timeRatio * 1.5); // Range: 0.5x to 2.0x
    const pointsEarned = isCorrect ? Math.floor(basePoints * reactionMultiplier) : 0;

    // Save response
    await supabase
      .from('quiz_responses')
      .insert({
        participant_id: participant.id,
        question_id: currentQuestion.id,
        session_id: session.id,
        selected_answers: answers,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        response_time_ms: (currentQuestion.time_limit - timeLeft) * 1000
      });

    // Update participant score
    const newScore = participant.total_score + pointsEarned;
    const newStreak = isCorrect ? (participant.current_streak + 1) : 0;
    
    await supabase
      .from('quiz_participants')
      .update({ 
        total_score: newScore,
        current_streak: newStreak,
        best_streak: Math.max(newStreak, participant.best_streak)
      })
      .eq('id', participant.id);

    setParticipant({
      ...participant,
      total_score: newScore,
      current_streak: newStreak
    });

    setLastResult({ correct: isCorrect, points: pointsEarned });
    setShowResult(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !quiz || !participant) {
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
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl">{participant.avatar_emoji}</span>
            <span className="font-semibold">{participant.nickname}</span>
          </div>
          <Badge variant="secondary" className="text-lg px-4">
            {participant.total_score} pts
          </Badge>
        </div>
      </header>

      <div className="container py-6">
        {/* Waiting State */}
        {session.status === 'waiting' && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-4 animate-bounce-subtle">🎮</div>
            <h2 className="font-display text-2xl font-bold mb-2">You're in!</h2>
            <p className="text-muted-foreground">Waiting for host to start the quiz...</p>
            
            <Card className="mt-8">
              <CardContent className="py-6">
                <h3 className="font-semibold mb-4">Players ({participants.length})</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {participants.map(p => (
                    <Badge 
                      key={p.id} 
                      variant={p.id === participant.id ? 'default' : 'secondary'}
                      className={p.id === participant.id ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {p.avatar_emoji} {p.nickname}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Quiz */}
        {session.status === 'active' && currentQuestion && (
          <div className="max-w-2xl mx-auto">
            {/* Timer & Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">
                  Question {(session.current_question_index || 0) + 1} / {questions.length}
                </Badge>
                <div className={`flex items-center gap-2 font-bold ${timeLeft <= 5 ? 'text-destructive timer-urgent' : ''}`}>
                  <Clock className="h-5 w-5" />
                  {timeLeft}s
                </div>
              </div>
              <Progress value={(timeLeft / (currentQuestion.time_limit || 30)) * 100} className="h-2" />
            </div>

            {/* Question */}
            <Card className="mb-6">
              <CardContent className="py-6">
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-center break-words whitespace-pre-wrap overflow-hidden">
                  {currentQuestion.question_text}
                </h2>
              </CardContent>
            </Card>

            {/* Show waiting message or answer options */}
            {hasAnswered ? (
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardContent className="py-8 text-center">
                  <div className="text-4xl mb-4">⏳</div>
                  <h3 className="font-display text-2xl font-bold mb-2">Answer Submitted!</h3>
                  <p className="text-muted-foreground">Waiting for next question...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Answer Options */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {(currentQuestion.options as string[]).map((option, index) => (
                    <Button
                      key={`${session.current_question_index}-${index}`}
                      variant={selectedAnswers.includes(option) ? 'default' : 'outline'}
                      className={`h-auto min-h-[3.5rem] py-3 px-4 text-left justify-start text-base sm:text-lg break-words whitespace-normal overflow-hidden ${
                        selectedAnswers.includes(option) ? 'bg-primary text-primary-foreground' : ''
                      }`}
                      onClick={() => selectAnswer(option)}
                      disabled={hasAnswered}
                    >
                      <span className="mr-3 font-bold flex-shrink-0">{String.fromCharCode(65 + index)}</span>
                      <span className="break-words overflow-hidden">{option}</span>
                    </Button>
                  ))}
                </div>

                {/* Submit Button */}
                {(currentQuestion.question_type === 'multiple_choice_multiple' || selectedAnswers.length > 0) && (
                  <Button
                    onClick={() => submitAnswer()}
                    disabled={hasAnswered || selectedAnswers.length === 0}
                    className="w-full mt-4 gradient-primary border-0"
                    size="lg"
                  >
                    Submit Answer
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Completed */}
        {session.status === 'completed' && (
          <div className="max-w-md mx-auto text-center py-10">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-3xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-muted-foreground mb-6">Great job playing!</p>
            
            <Card className="mb-6">
              <CardContent className="py-6">
                <p className="text-muted-foreground mb-2">Your Score</p>
                <p className="font-display text-5xl font-bold text-gradient">
                  {participant.total_score}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Best streak: {participant.best_streak} 🔥
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <h3 className="font-display font-bold mb-4 flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-secondary" />
                  Final Standings
                </h3>
                <div className="space-y-2">
                  {participants.slice(0, 10).map((p, index) => (
                    <div 
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        p.id === participant.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-6">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <span>{p.avatar_emoji} {p.nickname}</span>
                      </div>
                      <span className="font-bold">{p.total_score}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
