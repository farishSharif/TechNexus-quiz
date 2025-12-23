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
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float stagger-2" />
        </div>
        
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-slide-up">
              Learn, Play & <span className="text-gradient">Compete</span> with
              <br /><span className="text-gradient">Tech Nexus</span> <span className="text-muted-foreground">Quiz</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-up stagger-1">
              Create engaging quizzes, challenge friends in real-time, and discover 
              new knowledge through interactive gameplay.
            </p>

            {/* Quick Join Form */}
            <form onSubmit={handleJoinQuiz} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8 animate-slide-up stagger-2">
              <Input
                type="text"
                placeholder="Enter quiz PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="text-center text-lg font-semibold h-12"
                maxLength={7}
              />
              <Button type="submit" size="lg" className="gradient-primary border-0 btn-bounce h-12">
                <Play className="h-5 w-5 mr-2" />
                Join Quiz
              </Button>
            </form>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-3">
              <Link to="/browse">
                <Button variant="outline" size="lg" className="btn-bounce">
                  Browse Quizzes
                </Button>
              </Link>
              <Link to="/create">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 btn-bounce">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose <span className="text-gradient">Tech Nexus</span> <span className="text-muted-foreground">Quiz?</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: 'Real-Time Multiplayer', desc: 'Compete with friends and players worldwide in live quiz sessions.' },
              { icon: QrCode, title: 'Easy QR Joining', desc: 'Scan a QR code to instantly join any quiz session.' },
              { icon: Zap, title: 'Instant Feedback', desc: 'Get immediate results and see live leaderboards.' },
              { icon: Trophy, title: 'Climb the Ranks', desc: 'Track your progress and compete for the top spots.' },
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Create your first quiz in minutes and start engaging your audience today.
          </p>
          <Link to="/auth?tab=signup">
            <Button size="lg" variant="secondary" className="btn-bounce text-lg px-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
