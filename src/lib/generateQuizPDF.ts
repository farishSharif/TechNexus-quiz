import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Question {
    id: string;
    question_text: string;
    question_type: string;
    options: string[];
    correct_answers: string[];
    points: number;
    time_limit: number;
    order_index: number;
}

interface ParticipantResponse {
    participant_id: string;
    question_id: string;
    selected_answers: string[];
    is_correct: boolean;
    points_earned: number;
    response_time_ms: number | null;
}

interface Participant {
    id: string;
    nickname: string;
    avatar_emoji: string;
    total_score: number;
    best_streak: number;
}

interface QuizSessionData {
    quizTitle: string;
    completedAt: string;
    participantCount: number;
    questions: Question[];
    participants: Participant[];
    responses: ParticipantResponse[];
}

export function generateQuizPDF(data: QuizSessionData) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.quizTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Quiz Session Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Session Info
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(data.completedAt), 'MMMM d, yyyy h:mm a')}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Participants: ${data.participantCount}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Questions: ${data.questions.length}`, 14, yPos);
    yPos += 15;

    // Questions & Answers Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Questions & Answers', 14, yPos);
    yPos += 10;

    data.questions
        .sort((a, b) => a.order_index - b.order_index)
        .forEach((question, qIndex) => {
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');

            // Question text with wrapping
            const questionText = `Q${qIndex + 1}: ${question.question_text}`;
            const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 28);
            doc.text(splitQuestion, 14, yPos);
            yPos += splitQuestion.length * 5 + 3;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Type: ${formatQuestionType(question.question_type)} | Points: ${question.points} | Time: ${question.time_limit}s`, 14, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 6;

            // Options
            doc.setFontSize(10);
            question.options.forEach((option, optIndex) => {
                const isCorrect = question.correct_answers.includes(option);
                const prefix = isCorrect ? '[]' : '[x]';
                const letter = String.fromCharCode(65 + optIndex);

                if (isCorrect) {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(22, 163, 74); // Green
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                }

                const optionText = `  ${prefix} ${letter}. ${option}`;
                const splitOption = doc.splitTextToSize(optionText, pageWidth - 35);
                doc.text(splitOption, 14, yPos);
                yPos += splitOption.length * 4 + 2;
            });

            doc.setTextColor(0, 0, 0);
            yPos += 8;
        });

    // Leaderboard Section
    if (yPos > 200) {
        doc.addPage();
        yPos = 20;
    } else {
        yPos += 10;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Leaderboard', 14, yPos);
    yPos += 8;

    const leaderboardData = data.participants
        .sort((a, b) => b.total_score - a.total_score)
        .map((p, index) => [
            `${index + 1}`,
            p.nickname,
            `${p.total_score}`,
            `${p.best_streak}`
        ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Participant', 'Score', 'Best Streak']],
        body: leaderboardData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: 14, right: 14 },
    });

    // Save the PDF
    const fileName = `${data.quizTitle.replace(/[^a-z0-9]/gi, '_')}_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
}

function formatQuestionType(type: string): string {
    switch (type) {
        case 'multiple_choice_single':
            return 'Single Choice';
        case 'multiple_choice_multiple':
            return 'Multiple Choice';
        case 'true_false':
            return 'True/False';
        default:
            return type;
    }
}
