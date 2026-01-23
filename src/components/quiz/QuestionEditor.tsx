import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2 } from 'lucide-react';
import { QuestionType } from '@/types/quiz';

interface QuestionForm {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answers: string[];
  time_limit: number;
  points: number;
}

interface QuestionEditorProps {
  question: QuestionForm;
  index: number;
  onUpdate: (id: string, updates: Partial<QuestionForm>) => void;
  onUpdateOption: (questionId: string, optionIndex: number, value: string) => void;
  onToggleCorrectAnswer: (questionId: string, optionIndex: number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function QuestionEditor({
  question,
  index,
  onUpdate,
  onUpdateOption,
  onToggleCorrectAnswer,
  onRemove,
  canRemove
}: QuestionEditorProps) {
  return (
    <Card className="relative">
      <CardContent className="p-4 sm:pt-6 sm:px-6">
        {/* Mobile-optimized header */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 pt-2">
            <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <span className="font-bold text-base sm:text-lg text-primary">{index + 1}</span>
          </div>
          
          <div className="flex-1 min-w-0 space-y-4">
            {/* Question text and type - stacked on mobile */}
            <div className="flex flex-col gap-3">
              <Textarea
                placeholder="Enter your question..."
                value={question.question_text}
                onChange={(e) => onUpdate(question.id, { question_text: e.target.value })}
                className="text-base sm:text-lg font-medium min-h-[80px] resize-none w-full"
                rows={3}
              />
              <Select
                value={question.question_type}
                onValueChange={(v) => onUpdate(question.id, { 
                  question_type: v as QuestionType,
                  correct_answers: [],
                  options: v === 'true_false' ? ['True', 'False'] : question.options
                })}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice_single">Single Choice</SelectItem>
                  <SelectItem value="multiple_choice_multiple">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options - full width with increased spacing */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {question.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleCorrectAnswer(question.id, oIndex)}
                    className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors shrink-0 ${
                      question.correct_answers.includes(option) && option
                        ? 'bg-success text-success-foreground border-success'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {String.fromCharCode(65 + oIndex)}
                  </button>
                  <Input
                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                    value={option}
                    onChange={(e) => onUpdateOption(question.id, oIndex, e.target.value)}
                    disabled={question.question_type === 'true_false'}
                    className="flex-1 h-10 sm:h-9 text-base"
                  />
                </div>
              ))}
            </div>

            {/* Question Settings - stacked vertically on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap">Time:</Label>
                <Select 
                  value={question.time_limit.toString()} 
                  onValueChange={(v) => onUpdate(question.id, { time_limit: parseInt(v) })}
                >
                  <SelectTrigger className="w-24 h-10 sm:h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30, 45, 60].map(t => (
                      <SelectItem key={t} value={t.toString()}>{t}s</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground whitespace-nowrap">Points:</Label>
                <Select 
                  value={question.points.toString()} 
                  onValueChange={(v) => onUpdate(question.id, { points: parseInt(v) })}
                >
                  <SelectTrigger className="w-28 h-10 sm:h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[50, 100, 150, 200, 500, 1000].map(p => (
                      <SelectItem key={p} value={p.toString()}>{p} pts</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(question.id)}
            disabled={!canRemove}
            className="text-destructive hover:text-destructive shrink-0 h-10 w-10 sm:h-9 sm:w-9"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}