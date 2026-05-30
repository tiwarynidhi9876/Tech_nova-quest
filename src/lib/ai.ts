export interface AIExplanationRequest {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
}

export async function getGrokExplanation({
  question,
  selectedAnswer,
  correctAnswer,
}: AIExplanationRequest): Promise<string> {
  const backendUrl = import.meta.env.VITE_AI_BACKEND_URL || "http://localhost:3001";
  const response = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/ai/explain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, selectedAnswer, correctAnswer }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI generation failed: ${errorText}`);
  }

  const data = await response.json();
  const explanation = data?.explanation;

  if (!explanation) {
    throw new Error("AI returned no explanation.");
  }

  return explanation.trim();
}
