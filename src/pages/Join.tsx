import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, QrCode, Loader2 } from 'lucide-react';
import { AVATAR_EMOJIS } from '@/types/quiz';
import { QRScanner } from '@/components/quiz/QRScanner';

export default function Join() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';
  
  const [pinCode, setPinCode] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😀');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionFound, setSessionFound] = useState(!!initialPin);
  const navigate = useNavigate();

  const handleFindSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) return;
    
    setIsLoading(true);
    const cleanPin = pinCode.replace(/\s/g, '');
    
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('id, status')
      .eq('pin_code', cleanPin)
      .maybeSingle();
    
    if (error || !data) {
      toast.error('Quiz not found. Please check the PIN code.');
    } else if (data.status === 'completed' || data.status === 'cancelled') {
      toast.error('This quiz session has ended.');
    } else {
      setSessionFound(true);
    }
    
    setIsLoading(false);
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }
    
    setIsLoading(true);
    const cleanPin = pinCode.replace(/\s/g, '');
    
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('pin_code', cleanPin)
      .single();
    
    if (!session) {
      toast.error('Session not found');
      setIsLoading(false);
      return;
    }
    
    const { data: participant, error } = await supabase
      .from('quiz_participants')
      .insert({
        session_id: session.id,
        nickname: nickname.trim(),
        avatar_emoji: selectedEmoji
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to join quiz');
    } else {
      localStorage.setItem('participantId', participant.id);
      navigate(`/play/${session.id}`);
    }
    
    setIsLoading(false);
  };

  const handleQRScan = (scannedPin: string) => {
    setPinCode(scannedPin);
    // Auto-verify the session
    verifySession(scannedPin);
  };

  const verifySession = async (pin: string) => {
    setIsLoading(true);
    const cleanPin = pin.replace(/\s/g, '');
    
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('id, status')
      .eq('pin_code', cleanPin)
      .maybeSingle();
    
    if (error || !data) {
      toast.error('Quiz not found. Please check the PIN code.');
    } else if (data.status === 'completed' || data.status === 'cancelled') {
      toast.error('This quiz session has ended.');
    } else {
      setSessionFound(true);
      toast.success('Quiz found! Enter your nickname to join.');
    }
    
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Join a Quiz</CardTitle>
            <CardDescription>
              {sessionFound ? 'Choose your nickname and avatar' : 'Enter the quiz PIN or scan QR code'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sessionFound ? (
              <form onSubmit={handleFindSession} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit PIN"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="text-center text-2xl font-bold h-14 tracking-widest"
                  maxLength={7}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 gradient-primary border-0 h-12" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Find Quiz
                  </Button>
                  <QRScanner onScan={handleQRScan} />
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinSession} className="space-y-6">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="text-center text-lg font-semibold h-12"
                    maxLength={20}
                  />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">Choose your avatar</p>
                  <div className="grid grid-cols-8 gap-2">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          selectedEmoji === emoji 
                            ? 'bg-primary/20 ring-2 ring-primary scale-110' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button type="submit" className="w-full gradient-primary border-0 h-12" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Join Quiz
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => { setSessionFound(false); setPinCode(''); }}
                >
                  Enter Different PIN
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}