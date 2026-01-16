import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { QuizCard } from '@/components/quiz/QuizCard';
import { CategoryFilter } from '@/components/quiz/CategoryFilter';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Quiz, QuizCategory } from '@/types/quiz';
import { Search, Loader2 } from 'lucide-react';

export default function Browse() {
  const [quizzes, setQuizzes] = useState<(Quiz & { question_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, [selectedCategory]);

  const fetchQuizzes = async () => {
    setLoading(true);

    let query = supabase
      .from('quizzes')
      .select('*, questions(count)')
      .eq('is_public', true)
      .order('play_count', { ascending: false });

    if (selectedCategory) {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quizzes:', error);
    } else {
      const quizzesWithCount = data.map((quiz: any) => ({
        ...quiz,
        question_count: quiz.questions?.[0]?.count || 0
      }));
      setQuizzes(quizzesWithCount);
    }

    setLoading(false);
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Browse <span className="text-primary underline decoration-wavy decoration-4 underline-offset-4">Quizzes</span>
          </h1>
          <p className="text-muted-foreground">
            Discover and play quizzes created by our community
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Categories */}
        <div className="mb-8 overflow-x-auto pb-2">
          <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {/* Quiz Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No quizzes found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                questionCount={quiz.question_count}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
