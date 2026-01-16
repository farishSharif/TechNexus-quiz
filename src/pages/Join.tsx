import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, QrCode, Loader2 } from 'lucide-react';
import { AVATAR_EMOJIS } from '@/types/quiz';
import { QRScanner } from '@/components/quiz/QRScanner';
import { AvatarDisplay } from '@/components/ui/AvatarDisplay';

export default function Join() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';

  const [pinCode, setPinCode] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('Max');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionFound, setSessionFound] = useState(!!initialPin);
  const navigate = useNavigate();

  const [avatarSeeds, setAvatarSeeds] = useState([
    'Max', 'Bella', 'Charlie', 'Luna', 'Cooper',
    'Daisy', 'Rocky', 'Zoe', 'Bear', 'Molly',
    'Duke', 'Lola', 'Leo', 'Ruby', 'Tucker'
  ]);

  const regenerateAvatars = () => {
    const newSeeds = Array.from({ length: 15 }, () =>
      Math.random().toString(36).substring(2, 8)
    );
    setAvatarSeeds(newSeeds);
  };

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
        {/* Stage Card */}
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border-b-8 border-gray-200 shadow-xl transform transition-all hover:-translate-y-1">
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
              <QrCode className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-black mb-2 tracking-tight">Join the Fun! 🚀</h1>
            <p className="text-lg font-bold text-muted-foreground">
              {sessionFound ? 'Choose your player profile' : 'Enter PIN to start playing'}
            </p>
          </div>

          <CardContent className="p-0">
            {!sessionFound ? (
              <form onSubmit={handleFindSession} className="space-y-6">
                <Input
                  type="text"
                  placeholder="000 000"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="text-center text-4xl font-black h-20 rounded-2xl border-4 border-gray-100 focus:border-primary focus:ring-4 focus:ring-primary/20 tracking-[1rem] placeholder:tracking-normal placeholder:font-bold"
                  maxLength={7}
                />
                <div className="flex gap-4">
                  <Button type="submit" size="xl" className="flex-1 text-xl h-16" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Play className="h-6 w-6 mr-2" />}
                    Find Quiz
                  </Button>
                  <div className="h-16 w-16">
                    <QRScanner onScan={handleQRScan} />
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinSession} className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-lg font-black text-center block" htmlFor="nickname">
                    What should we call you?
                  </Label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="Enter nickname..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="text-center text-2xl font-black h-16 rounded-2xl border-4 border-gray-100"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-lg font-black text-center text-muted-foreground">Pick your Avatar</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 justify-items-center">
                    {avatarSeeds.map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setSelectedEmoji(seed)}
                        className={`p-1 rounded-full transition-all hover:scale-110 active:scale-95 ${selectedEmoji === seed
                          ? 'ring-4 ring-primary shadow-xl scale-110 bg-white'
                          : 'hover:bg-white hover:shadow-md opacity-80 hover:opacity-100'
                          }`}
                      >
                        <AvatarDisplay seed={seed} size="md" />
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={regenerateAvatars}
                      className="text-xs"
                    >
                      🎲 Randomize Options
                    </Button>
                  </div>
                </div>

                <Button type="submit" size="xl" variant="success" className="w-full text-2xl h-12" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                  Ready to Go! 🎮
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground font-bold"
                  onClick={() => { setSessionFound(false); setPinCode(''); }}
                >
                  ← Enter Different PIN
                </Button>
              </form>
            )}
          </CardContent>
        </div>
      </div>
    </MainLayout>
  );
}