import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, QrCode, Loader2, Search } from 'lucide-react';
import { AVATAR_EMOJIS, CHARACTER_IMAGES } from '@/types/quiz';
import { QRScanner } from '@/components/quiz/QRScanner';
import { AvatarDisplay } from '@/components/ui/AvatarDisplay';

const ANIME_CHARACTERS = AVATAR_EMOJIS;

const getRandomAvatars = (count: number) => {
  const shuffled = [...ANIME_CHARACTERS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export default function Join() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';

  const [pinCode, setPinCode] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('Tanjiro Kamado');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionFound, setSessionFound] = useState(!!initialPin);
  const [avatarSearch, setAvatarSearch] = useState('');
  const navigate = useNavigate();

  const [avatarSeeds, setAvatarSeeds] = useState(() => getRandomAvatars(15));

  const regenerateAvatars = () => {
    setAvatarSeeds(getRandomAvatars(15));
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
        <div className="w-full max-w-md bg-card p-8 rounded-3xl border-b-8 border-border/50 shadow-xl transform transition-all hover:-translate-y-1">
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
                  className="text-center text-4xl font-black h-20 rounded-2xl border-4 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/20 tracking-[1rem] placeholder:tracking-normal placeholder:font-bold"
                  maxLength={7}
                />
                <div className="space-y-4">
                  <Button type="submit" size="xl" className="w-full text-xl h-16 font-display font-black tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Play className="h-6 w-6 mr-2 fill-current" />}
                    FIND QUIZ
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground font-bold">Or</span>
                    </div>
                  </div>

                  <QRScanner
                    onScan={handleQRScan}
                    className="w-full h-14 text-lg font-bold border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                  />
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
                    className="text-center text-2xl font-black h-16 rounded-2xl border-4 border-border/50"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search characters (e.g. Gojo)"
                      value={avatarSearch}
                      onChange={(e) => setAvatarSearch(e.target.value)}
                      className="pl-10 h-10 rounded-xl border-2 border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 bg-muted/30 p-4 rounded-2xl border-2 border-dashed border-border/50 justify-items-center max-h-[250px] overflow-y-auto custom-scrollbar">
                    {(avatarSearch.trim()
                      ? ANIME_CHARACTERS.filter(name => name.toLowerCase().includes(avatarSearch.toLowerCase()))
                      : avatarSeeds
                    ).map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setSelectedEmoji(seed)}
                        className={`p-1 rounded-full transition-all hover:scale-110 active:scale-95 ${selectedEmoji === seed
                          ? 'ring-4 ring-primary shadow-xl scale-110 bg-card'
                          : 'hover:bg-card hover:shadow-md opacity-80 hover:opacity-100'
                          }`}
                        title={seed}
                      >
                        <AvatarDisplay
                          seed={seed}
                          size="md"
                        />
                      </button>
                    ))}
                    {(avatarSearch.trim() && ANIME_CHARACTERS.filter(name => name.toLowerCase().includes(avatarSearch.toLowerCase())).length === 0) && (
                      <p className="col-span-full text-sm text-muted-foreground py-4">No characters found 🔍</p>
                    )}
                  </div>
                  {!avatarSearch.trim() && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={regenerateAvatars}
                        className="text-xs"
                      >
                        More Avatar's 🎲
                      </Button>
                    </div>
                  )}
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