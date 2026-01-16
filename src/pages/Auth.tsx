import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, displayName);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } else {
      toast.success('Account created! Welcome to Tech Nexus Quiz!');
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-10rem)] py-12">
        {/* Stage Card */}
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border-b-8 border-gray-200 shadow-xl mx-auto transform transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-black mb-2">
              Welcome to
              <br />
              <span className="text-primary text-5xl tracking-tight">Tech Nexus</span>
              <span className="text-muted-foreground ml-2 text-3xl">Quiz</span>
            </h1>
            <p className="text-lg font-bold text-muted-foreground">Sign in to create and host quizzes</p>
          </div>

          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-muted/50 rounded-2xl p-1">
              <TabsTrigger
                value="signin"
                className="rounded-xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md h-full"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md h-full"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="font-bold text-base ml-1">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-2 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="font-bold text-base ml-1">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-2 font-bold"
                  />
                </div>
                <Button type="submit" size="xl" className="w-full text-xl mt-4" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                  Please Sign In 🔓
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="font-bold text-base ml-1">Display Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Quiz Master"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 rounded-xl border-2 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="font-bold text-base ml-1">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-2 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="font-bold text-base ml-1">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 rounded-xl border-2 font-bold"
                  />
                </div>
                <Button type="submit" size="xl" variant="action" className="w-full text-xl mt-4" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                  Create Account 🚀
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
