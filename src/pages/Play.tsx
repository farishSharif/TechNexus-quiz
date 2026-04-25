import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { QuizSession, Quiz, Question, QuizParticipant } from '@/types/quiz';
import { toast } from 'sonner';
import { Loader2, Trophy, Clock } from 'lucide-react';
import { AvatarDisplay } from '@/components/ui/AvatarDisplay';

export default function Play() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participant, setParticipant] = useState<QuizParticipant | null>(null);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Timer effect - only runs when timeLeft is set and not answered
  useEffect(() => {
    if (session?.status !== 'active' || timeLeft === 0 || timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.status, hasAnswered, timeLeft]);

  // Handle time up separately to avoid closure issues
  useEffect(() => {
    if (timeLeft === 0 && !hasAnswered && !isSubmitting) {
      handleTimeUp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, hasAnswered, isSubmitting]);

  // Initialize timer when session becomes active or question changes
  useEffect(() => {
    if (session?.status === 'active' && questions.length > 0) {
      const questionIndex = session.current_question_index || 0;
      const question = questions[questionIndex];

      if (question && question.id !== currentQuestionId) {
        // Reset all question state
        setSelectedAnswers([]);
        setHasAnswered(false);
        setShowResult(false);
        setIsSubmitting(false);
        setCurrentQuestionId(question.id);
        setTimeLeft(question.time_limit || 30);
      }
    }
  }, [session?.status, session?.current_question_index, questions, currentQuestionId]);

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
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true });
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
          // Just update the session - the useEffect will handle state reset
          setSession(newSession);
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
        (payload) => {
          // Surgically update only the changed participant in local state
          // instead of re-fetching ALL participants on every event.
          // This prevents an O(N²) query storm when N players all answer simultaneously.
          if (payload.eventType === 'INSERT') {
            setParticipants(prev =>
              [...prev, payload.new as QuizParticipant].sort((a, b) => {
                if (b.total_score !== a.total_score) return b.total_score - a.total_score;
                return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
              })
            );
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev =>
              prev
                .map(p => p.id === payload.new.id ? payload.new as QuizParticipant : p)
                .sort((a, b) => {
                  if (b.total_score !== a.total_score) return b.total_score - a.total_score;
                  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                })
            );
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
          }
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
      // For multiple choice multiple - toggle selection
      const newAnswers = selectedAnswers.includes(option)
        ? selectedAnswers.filter(a => a !== option)
        : [...selectedAnswers, option];

      setSelectedAnswers(newAnswers);

      // Auto-submit when user selects same number of options as correct answers
      const correctAnswersCount = (currentQuestion.correct_answers as string[]).length;
      if (newAnswers.length === correctAnswersCount) {
        submitAnswer(newAnswers);
      }
    }
  };

  const submitAnswer = async (answers: string[] = selectedAnswers) => {
    // Prevent double submission
    if (!session || !participant || isSubmitting || hasAnswered) return;

    setIsSubmitting(true);
    setHasAnswered(true);

    const currentQuestion = questions[session.current_question_index || 0];
    if (!currentQuestion) {
      setIsSubmitting(false);
      return;
    }

    const correctAnswers = currentQuestion.correct_answers as string[];

    // Check if answer is correct
    const isCorrect = answers.length > 0 &&
      answers.length === correctAnswers.length &&
      answers.every(a => correctAnswers.includes(a));

    // Calculate points based on reaction time
    const basePoints = currentQuestion.points;
    const currentTimeLeft = timeLeft ?? 0;
    const timeRatio = currentTimeLeft / currentQuestion.time_limit;

    // Points formula: 0.5x to 2.0x multiplier based on speed
    const reactionMultiplier = 0.5 + (timeRatio * 1.5);
    const pointsEarned = isCorrect ? Math.floor(basePoints * reactionMultiplier) : 0;
    const currentResponseTime = (currentQuestion.time_limit - currentTimeLeft) * 1000;

    try {
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
          response_time_ms: (currentQuestion.time_limit - currentTimeLeft) * 1000
        });

      // Update participant score
      const newScore = participant.total_score + pointsEarned;
      const newStreak = isCorrect ? ((participant.current_streak || 0) + 1) : 0;

      await supabase
        .from('quiz_participants')
        .update({
          total_score: newScore,
          current_streak: newStreak,
          best_streak: Math.max(newStreak, (participant.best_streak || 0)),
        })
        .eq('id', participant.id);

      setParticipant({
        ...participant,
        total_score: newScore,
        current_streak: newStreak,
      });

      setShowResult(true);
    } finally {
      setIsSubmitting(false);
    }
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

  // Calculate current rank
  const sortedParticipants = [...participants].sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return (b.total_score || 0) - (a.total_score || 0);
    }
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });
  const currentRank = sortedParticipants.findIndex(p => p.id === participant.id) + 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <AvatarDisplay seed={participant.avatar_emoji} size="sm" />
            <span className="font-semibold">{participant.nickname}</span>
          </div>
          <Badge variant="secondary" className="text-lg px-4 gap-2">
            <span>#{currentRank}</span>
            <span className="opacity-20 text-xs">|</span>
            <span>{participant.total_score} pts</span>
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

            <Card className="mt-8 bg-card dark:bg-black/20 border-border dark:border-white/10 backdrop-blur-md">
              <CardContent className="py-6">
                <h3 className="font-semibold mb-4">Players ({participants.length})</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {participants.map(p => (
                    <div
                      key={p.id}
                      className="flex flex-col items-center animate-bounce-in"
                    >
                      <div className="relative">
                        <AvatarDisplay seed={p.avatar_emoji} size="md" className={p.id === participant.id ? 'ring-4 ring-primary' : ''} />
                        {p.id === participant.id && (
                          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 scale-75 whitespace-nowrap">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-bold mt-1 max-w-[4rem] truncate">{p.nickname}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Quiz */}
        {(session.status === 'active' || session.status === 'paused') && currentQuestion && (
          <div className="max-w-2xl mx-auto">
            {/* Timer & Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">
                  Question {(session.current_question_index || 0) + 1} / {questions.length}
                </Badge>
                <div className={`flex items-center gap-2 font-black text-xl ${(timeLeft ?? 0) <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                  <Clock className="h-6 w-6" />
                  {timeLeft ?? 0}s
                </div>
              </div>
              <Progress value={((timeLeft ?? 0) / (currentQuestion.time_limit || 30)) * 100} className="h-4 rounded-full border-2 border-black/5" />
            </div>

            {/* Question */}
            <Card className="mb-6 bg-card dark:bg-black/20 border-border dark:border-white/10 backdrop-blur-md">
              <CardContent className="py-6">
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-center break-words whitespace-pre-wrap overflow-hidden leading-tight">
                  {currentQuestion.question_text}
                </h2>
              </CardContent>
            </Card>

            {/* Show leaderboard or reveal state */}
            {session.show_leaderboard ? (
              <div className="space-y-4">
                {/* Live Leaderboard - Only shown when Host enables it */}
                <Card className="mb-6 bg-card dark:bg-black/40 border-border dark:border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-700">
                  <CardContent className="py-4">
                    <h3 className="font-display font-bold mb-2 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-secondary" />
                      Leaderboard
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        // Sort participants by score descending, then by joined_at ascending as tie-breaker
                        const sorted = [...participants].sort((a, b) => {
                          if (b.total_score !== a.total_score) {
                            return (b.total_score || 0) - (a.total_score || 0);
                          }
                          return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                        });
                        // Find current user's rank (1-based)
                        const userIndex = sorted.findIndex(p => p.id === participant.id);
                        // Top 10
                        const top10 = sorted.slice(0, 10);
                        // If user not in top 10, show their row after a separator
                        return (
                          <>
                            {top10.map((p, index) => (
                              <div
                                key={p.id}
                                className={`flex items-center justify-between p-4 rounded-xl border-b-4 transition-all hover:scale-[1.02] ${p.id === participant.id
                                  ? 'bg-primary text-primary-foreground border-primary-foreground/20'
                                  : index === 0
                                    ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                                    : index === 1
                                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                                      : index === 2
                                        ? 'bg-orange-100 text-orange-900 border-orange-300'
                                        : 'bg-card border-border hover:border-primary/30'
                                  }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-black text-lg ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                    index === 1 ? 'bg-slate-300 text-slate-800' :
                                      index === 2 ? 'bg-orange-300 text-orange-900' :
                                        'bg-background/20'
                                    }`}>
                                    {index + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-lg leading-none">{p.nickname}</span>
                                    <div className="mt-1"><AvatarDisplay seed={p.avatar_emoji} size="sm" /></div>
                                  </div>
                                </div>
                                <span className="font-black text-2xl">{p.total_score}</span>
                              </div>
                            ))}
                            {userIndex >= 10 && (
                              <>
                                <div className="border-t-2 border-dashed border-border my-4" />
                                <div
                                  className="flex items-center justify-between p-4 rounded-xl border-b-4 bg-primary text-primary-foreground border-primary-foreground/20"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 font-black text-lg">
                                      {userIndex + 1}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-lg leading-none">{participant.nickname}</span>
                                      <div className="mt-1"><AvatarDisplay seed={participant.avatar_emoji} size="sm" /></div>
                                    </div>
                                  </div>
                                  <span className="font-black text-2xl">{participant.total_score}</span>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {/* Answer Options Phase */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {(currentQuestion.options as string[]).map((option, index) => {
                    const isSelected = selectedAnswers.includes(option);
                    const isCorrect = (currentQuestion.correct_answers as string[]).includes(option);
                    const isRevealing = timeLeft === 0 && !session.show_leaderboard;

                    const variant: "default" | "outline" | "success" | "destructive" = isSelected ? "default" : "outline";
                    let customStyles = "";

                    if (isRevealing) {
                      if (isCorrect) {
                        customStyles = "bg-green-500 text-white border-green-700 hover:bg-green-500 scale-[1.05] z-10 shadow-lg ring-4 ring-green-500/40 opacity-100 disabled:opacity-100";
                      } else if (isSelected && !isCorrect) {
                        customStyles = "bg-red-500 text-white border-red-700 hover:bg-red-500 scale-[1.02] opacity-100 disabled:opacity-100";
                      } else {
                        customStyles = "opacity-30 grayscale-[0.5]";
                      }
                    } else if (hasAnswered) {
                      if (isSelected) {
                        customStyles = "bg-primary text-primary-foreground border-primary-foreground/20 ring-4 ring-primary/20 scale-[1.02] disabled:opacity-100";
                      } else {
                        customStyles = "opacity-40";
                      }
                    } else {
                      customStyles = "hover:border-primary/50 hover:scale-[1.02]";
                    }

                    return (
                      <Button
                        key={`${session.current_question_index}-${index}`}
                        variant={variant as "default" | "outline" | "success" | "destructive"}
                        className={`h-auto min-h-[5rem] py-4 px-6 text-left justify-start text-lg sm:text-xl font-bold break-words whitespace-normal overflow-hidden rounded-2xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${customStyles}`}
                        onClick={() => selectAnswer(option)}
                        disabled={hasAnswered || isRevealing}
                      >
                        {currentQuestion.question_type === 'multiple_choice_multiple' ? (
                          <Checkbox
                            checked={isSelected}
                            className={`mr-3 h-5 w-5 pointer-events-none ${isRevealing && isCorrect ? 'border-white' : ''}`}
                          />
                        ) : (
                          <span className={`mr-3 font-bold flex-shrink-0 ${isRevealing && isCorrect ? 'text-white' : ''}`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                        )}
                        <span className="break-words overflow-hidden">{option}</span>
                        {isRevealing && isCorrect && (
                          <span className="ml-auto text-2xl animate-bounce-in"></span>
                        )}
                        {isRevealing && isSelected && !isCorrect && (
                          <span className="ml-auto text-2xl animate-bounce-in"></span>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Hint for multi-select questions */}
                {currentQuestion.question_type === 'multiple_choice_multiple' && !hasAnswered && (timeLeft !== 0 && !session.show_leaderboard) && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Select {(currentQuestion.correct_answers as string[]).length} option{(currentQuestion.correct_answers as string[]).length > 1 ? 's' : ''} to submit
                  </p>
                )}

                {hasAnswered && (timeLeft !== 0 && !session.show_leaderboard) && (
                  <p className="text-center mt-6 font-bold text-primary animate-pulse flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    Answer Locked! Waiting for result...
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {session.status === 'completed' && (
          <div className="max-w-md mx-auto text-center py-10">
            {!session.show_leaderboard ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000">
                <div className="relative mb-8">
                  <div className="text-8xl animate-bounce">🏆</div>
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
                  </div>
                </div>
                <h2 className="font-display text-4xl font-black mb-4 gradient-text">Calculating Results...</h2>
                <p className="text-xl font-bold text-muted-foreground animate-pulse">Waiting for the final podium reveal!</p>

                <Card className="mt-12 bg-primary/10 border-primary/20 backdrop-blur-md w-full">
                  <CardContent className="py-8">
                    <p className="text-muted-foreground mb-2 font-bold uppercase tracking-widest text-sm">Your Final Score</p>
                    <p className="text-6xl font-black text-primary">{participant.total_score}</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="animate-in zoom-in fade-in duration-1000">
                <div className="text-6xl mb-4 animate-tada">🎉</div>
                <h2 className="font-display text-4xl font-black mb-2 gradient-text">Quiz Complete!</h2>
                <p className="text-muted-foreground mb-6 font-bold text-lg">Check out the final standings!</p>

                <Card className="mb-6 bg-card dark:bg-black/40 backdrop-blur-md border-primary/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-primary to-yellow-400"></div>
                  <CardContent className="py-8">
                    <p className="text-muted-foreground mb-2 font-bold uppercase tracking-widest text-sm text-center">Your Final Score</p>
                    <p className="font-display text-7xl font-black text-primary text-center">
                      {participant.total_score}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card dark:bg-black/40 backdrop-blur-md border-primary/20 shadow-xl overflow-hidden mb-20">
                  <div className="bg-muted/50 py-3 border-b">
                    <h3 className="font-display font-bold flex items-center justify-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Final Standings
                    </h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                    {(() => {
                      const top10 = sortedParticipants.slice(0, 10);
                      const userIndex = sortedParticipants.findIndex(p => p.id === participant.id);

                      return (
                        <>
                          {top10.map((p, index) => (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between p-4 rounded-xl border-b-4 transition-all ${p.id === participant.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card border-border'
                                }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-black text-lg ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                  index === 1 ? 'bg-slate-300 text-slate-800' :
                                    index === 2 ? 'bg-orange-300 text-orange-900' :
                                      'bg-muted'
                                  }`}>
                                  {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index + 1}
                                </div>
                                <div className="flex items-center gap-3">
                                  <AvatarDisplay seed={p.avatar_emoji} size="md" />
                                  <span className="font-bold text-lg">{p.nickname}</span>
                                </div>
                              </div>
                              <span className="font-black text-xl">{p.total_score}</span>
                            </div>
                          ))}

                          {userIndex >= 0 && (
                            <div className="sticky bottom-0 left-0 right-0 z-10 -mx-4 -mb-4 mt-6">
                              <div className="bg-primary p-4 text-primary-foreground shadow-2xl">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 font-black">
                                      {userIndex + 1}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-black opacity-70">Your Ranking</span>
                                      <div className="flex items-center gap-2">
                                        <AvatarDisplay seed={participant.avatar_emoji} size="sm" />
                                        <span className="font-bold">{participant.nickname}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="font-black text-2xl">{participant.total_score}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
}