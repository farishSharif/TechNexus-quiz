import { Button } from '@/components/ui/button';
import { QuizCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/quiz';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selected: QuizCategory | null;
  onSelect: (category: QuizCategory | null) => void;
}

const categories: QuizCategory[] = [
  'trivia',
  'technology',
  'science_nature',
  'history',
  'geography',
  'entertainment',
  'sports',
  'art_literature',
  'languages',
  'other'
];

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-full',
          selected === null && 'gradient-primary border-0'
        )}
      >
        All
      </Button>
      {categories.map((category) => (
        <Button
          key={category}
          variant={selected === category ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(category)}
          className={cn(
            'rounded-full',
            selected === category && 'gradient-primary border-0'
          )}
        >
          <span className="mr-1">{CATEGORY_ICONS[category]}</span>
          {CATEGORY_LABELS[category]}
        </Button>
      ))}
    </div>
  );
}
