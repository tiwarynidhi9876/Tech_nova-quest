import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizQuestion from "@/components/QuizQuestion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getQuestionsForQuest } from "@/data/questQuestions";
import { getGrokExplanation } from "@/lib/ai";
import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";

const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questId, questTitle, questCategory, xpReward } = location.state || {};

  // Get questions for the specific quest
  const questions = questId ? getQuestionsForQuest(questId) : [];

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<(boolean | null)[]>(
    Array(questions.length).fill(null),
  );
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(
    Array(questions.length).fill(""),
  );
  const [aiExplanations, setAIExplanations] = useState<string[]>(
    Array(questions.length).fill(""),
  );
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Redirect if no quest data
  if (!questId || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">No Quest Selected</h1>
            <p className="text-muted-foreground mb-6">
              Please select a quest to start the quiz.
            </p>
            <Button onClick={() => navigate("/quests")}>
              Browse Quests
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const loadAIExplanation = async (selected: string) => {
    if (aiExplanations[index]) {
      console.log("Explanation already cached for this question");
      return;
    }

    setExplanationLoading(true);
    setAIError(null);

    try {
      console.log("Requesting AI explanation for:", { index, selected, question: questions[index].question });
      const explanation = await getGrokExplanation({
        question: questions[index].question,
        selectedAnswer: selected,
        correctAnswer: questions[index].correctAnswer,
      });

      console.log("Received explanation:", explanation);
      setAIExplanations((prev) => {
        const next = [...prev];
        next[index] = explanation;
        console.log("Updated explanations state:", next);
        return next;
      });
    } catch (error) {
      console.error("Error loading explanation:", error);
      const message =
        error instanceof Error
          ? error.message
          : "AI explanation is unavailable. Check your API key and network connection.";
      setAIError(message);
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleAnswer = async (isCorrect: boolean, selected: string) => {
    const updated = [...answered];
    const updatedSelected = [...selectedAnswers];

    if (updated[index] === null && isCorrect) {
      setScore(score + 1);
    }

    updated[index] = isCorrect;
    updatedSelected[index] = selected;
    setAnswered(updated);
    setSelectedAnswers(updatedSelected);

    if (!isCorrect) {
      await loadAIExplanation(selected);
    }
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    }
  };

  const prev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const finishQuiz = () => {
    setShowResults(true);
  };

  const restartQuiz = () => {
    setIndex(0);
    setScore(0);
    setAnswered(Array(questions.length).fill(null));
    setSelectedAnswers(Array(questions.length).fill(""));
    setAIExplanations(Array(questions.length).fill(""));
    setAIError(null);
    setShowResults(false);
  };

  const percentage = Math.round((score / questions.length) * 100);
  const earnedXP = Math.round((score / questions.length) * xpReward);

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <Card className="max-w-2xl mx-auto p-8 text-center bg-gradient-card border-border/50">
            <div className="mb-6">
              <Trophy className="w-20 h-20 mx-auto text-primary mb-4" />
              <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                Quest Complete!
              </h1>
              <p className="text-muted-foreground text-lg">{questTitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-lg bg-card border border-border/50">
                <p className="text-muted-foreground mb-2">Your Score</p>
                <p className="text-4xl font-bold text-primary">
                  {score}/{questions.length}
                </p>
                <p className="text-2xl font-semibold text-secondary mt-2">
                  {percentage}%
                </p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border/50">
                <p className="text-muted-foreground mb-2">XP Earned</p>
                <p className="text-4xl font-bold text-success">
                  {earnedXP}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  out of {xpReward} XP
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate("/quests")}
                className="w-full font-bold"
                size="lg"
              >
                Browse More Quests
              </Button>
              <Button
                onClick={restartQuiz}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Retry Quest
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="ghost"
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                {questTitle}
              </h1>
              <p className="text-muted-foreground">{questCategory}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Potential Reward</p>
              <p className="text-2xl font-bold text-primary">{xpReward} XP</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span>
              Score: {score}/{questions.length}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <QuizQuestion
            question={questions[index].question}
            options={questions[index].options}
            correctAnswer={questions[index].correctAnswer}
            onAnswer={handleAnswer}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center max-w-xl mx-auto">
          <Button
            onClick={prev}
            disabled={index === 0}
            variant="outline"
            size="lg"
          >
            Previous
          </Button>

          {index === questions.length - 1 ? (
            <Button
              onClick={finishQuiz}
              disabled={answered[index] === null}
              size="lg"
              className="font-bold"
            >
              Finish Quest
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={next}
              disabled={answered[index] === null}
              size="lg"
            >
              Next Question
            </Button>
          )}
        </div>

        {/* Answer feedback */}
        {answered[index] !== null && (
          <div className="max-w-xl mx-auto mt-6 space-y-4">
            <Card
              className={`p-4 ${
                answered[index]
                  ? "bg-success/10 border-success/50"
                  : "bg-destructive/10 border-destructive/50"
              }`}
            >
              <p className="text-center font-semibold">
                {answered[index] ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              {!answered[index] && (
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    Your answer "{selectedAnswers[index]}" is incorrect.
                  </p>
                  <p className="mt-2">
                    The correct answer is "{questions[index].correctAnswer}".
                  </p>
                </div>
              )}
            </Card>

            {!answered[index] && (
              <Card className="p-4 bg-primary/5 border-primary/50">
                <div className="text-sm leading-6">
                  {explanationLoading ? (
                    <p className="text-muted-foreground animate-pulse">⏳ Generating AI explanation...</p>
                  ) : aiError ? (
                    <p className="text-destructive font-medium">❌ {aiError}</p>
                  ) : aiExplanations[index] ? (
                    <div>
                      <p className="text-primary font-semibold mb-2">💡 AI Explanation:</p>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {aiExplanations[index]}
                      </p>
                    </div>
                  ) : questions[index].explanation ? (
                    <div>
                      <p className="text-primary font-semibold mb-2">📖 Explanation:</p>
                      <p className="text-muted-foreground">{questions[index].explanation}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      The selected option does not match the correct choice. Make sure you understand why the correct answer is {questions[index].correctAnswer}.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default QuizPage;
