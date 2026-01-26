import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';
import { Play, Plus, Users, Zap, Trophy, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const [pinCode, setPinCode] = useState('');
  const navigate = useNavigate();

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.trim()) {
      navigate(`/join?pin=${pinCode.replace(/\s/g, '')}`);
    }
  };

  return (
    <MainLayout>
      {/* Hero / Stage Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-background py-20">

        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-success/20 rounded-full blur-[100px] animate-pulse-glow stagger-2" />
        </div>

        <div className="container relative z-10 max-w-5xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-block mb-6 animate-bounce-subtle">
            <span className="bg-card border-b-4 border-border/50 text-primary font-black px-6 py-2 rounded-2xl shadow-sm text-sm uppercase tracking-widest">
              Gamified Learning 🚀
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight mb-8 leading-tight drop-shadow-sm">
            Ready to <span className="text-primary decoration-4 underline-offset-8">Play</span> &
            <br />
            <span className="text-secondary-foreground">Master New Skills?</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the action-packed quiz platform where learning feels like a game.
            Challenge friends, earn badges, and top the leaderboard! 🏆
          </p>

          {/* Main Action Stage */}
          <div className="bg-card p-4 md:p-8 rounded-3xl border-b-8 border-border/50 shadow-xl max-w-3xl mx-auto transform transition-all hover:-translate-y-1 duration-300">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center p-2">

              <div className="flex-1 w-full relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <span className="text-2xl">🔑</span>
                </div>
                <Input
                  type="text"
                  placeholder="ENTER GAME PIN"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="pl-14 text-center text-2xl font-black h-20 rounded-2xl border-4 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/20 bg-muted/50 uppercase tracking-widest placeholder:text-muted-foreground transition-all group-hover:bg-card"
                  maxLength={7}
                />
              </div>

              <Button
                onClick={handleJoinQuiz}
                size="xl"
                className="w-full md:w-auto text-xl bg-success text-white border-success-darker hover:bg-success hover:scale-105 active:scale-95 transition-all shadow-xl h-20"
              >
                JOIN NOW ⚡
              </Button>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6 border-t-2 border-gray-100 pt-8 border-dashed">
              <Link to="/create">
                <Button variant="outline" size="lg" className="text-lg font-bold border-2 hover:bg-gray-50">
                  <Plus className="h-6 w-6 mr-2 text-primary" />
                  Create a Quiz
                </Button>
              </Link>
              <Link to="/dashboard" className="text-muted-foreground font-bold hover:text-primary transition-colors flex items-center gap-2">
                <Button className="font-bold">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Tiles Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <h2 className="font-display text-4xl md:text-5xl font-black text-center mb-16 tracking-tight">
            Why Players <span className="text-destructive">Love It</span> ❤️
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '🎮', color: 'bg-purple-100 text-purple-600', title: 'Live Battles', desc: 'Compete in real-time multiplayer showdowns.' },
              { icon: '📱', color: 'bg-blue-100 text-blue-600', title: 'Scan & Play', desc: 'Jump in instantly with a simple QR code scan.' },
              { icon: '⚡', color: 'bg-yellow-100 text-yellow-600', title: 'Power Ups', desc: 'Earn streaks and bonuses for fast answers.' },
              { icon: '👑', color: 'bg-green-100 text-green-600', title: 'Leaderboards', desc: 'Climb the ranks and claim your victory.' },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-card p-8 rounded-3xl border-b-8 border-border/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/20 cursor-default"
              >
                <div className={`w-20 h-20 ${feature.color} rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="font-display text-2xl font-black mb-3 text-center group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground font-bold text-center leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Bold CTA */}
      <section className="py-24 bg-primary overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pattern-dots" />
        <div className="container text-center relative z-10">
          <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-8 drop-shadow-md">
            Unleash Your Inner Genius! 🧠
          </h2>
          <p className="text-xl text-white/90 font-bold mb-12 max-w-2xl mx-auto">
            Join thousands of creators and players. It's free, fun, and faster than ever to get started.
          </p>
          <Link to="/auth?tab=signup">
            <Button size="xl" variant="secondary" className="bg-background text-primary border-white/50 hover:bg-muted text-xl px-12 h-20 shadow-2xl">
              Start Creating for Free 🚀
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
