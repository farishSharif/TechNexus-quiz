import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quiz, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz';
import { Users, HelpCircle } from 'lucide-react';

interface QuizCardProps {
  quiz: Quiz;
  questionCount?: number;
}

export function QuizCard({ quiz, questionCount = 0 }: QuizCardProps) {
  return (
    <Link to={`/quiz/${quiz.id}`}>
      <Card className="quiz-card h-full overflow-hidden border-2 border-border dark:border-white/10 bg-card dark:bg-black/40 backdrop-blur-md hover:border-primary/20 cursor-pointer transition-colors">
        {/* Cover Image */}
        <div className="relative h-36 bg-primary/10">
          {quiz.cover_image_url ? (
            <img
              src={quiz.cover_image_url}
              alt={quiz.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">
                {CATEGORY_ICONS[quiz.category]}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {CATEGORY_LABELS[quiz.category]}
            </Badge>
          </div>
        </div>

        <CardContent className="pt-4">
          <h3 className="font-display text-lg font-bold line-clamp-2 mb-2">
            {quiz.title}
          </h3>
          {quiz.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {quiz.description}
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-0 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            <span>{questionCount} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{quiz.play_count} plays</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
