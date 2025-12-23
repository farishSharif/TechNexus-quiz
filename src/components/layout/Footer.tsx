import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-lg font-bold">
            <span className="text-gradient">Tech Nexus</span>
            <span className="text-muted-foreground ml-1">Quiz</span>
          </span>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/browse" className="hover:text-foreground transition-colors">
              Browse Quizzes
            </Link>
            <Link to="/join" className="hover:text-foreground transition-colors">
              Join Quiz
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Tech Nexus Quiz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
