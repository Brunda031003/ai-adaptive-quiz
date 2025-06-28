"use client";

import React, { useState, useEffect } from "react";

export default function Home() {
  const [question, setQuestion] = useState("Loading question...");
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [confidence, setConfidence] = useState("high");
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions] = useState(5);
  const [currentLevel, setCurrentLevel] = useState("medium");
  const [results, setResults] = useState([]);
  const [confidenceStats, setConfidenceStats] = useState({
    high: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    low: { correct: 0, total: 0 },
  });
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Parse AI-generated question text
  function parseAIQuestion(text) {
    const lines = text.trim().split("\n");

    let questionLines = [];
    let options = [];
    let correctAnswerLetter = "";
    let correctAnswer = "";

    for (let line of lines) {
      line = line.trim();

      const optMatch = line.match(/^([A-D])[\.\)]\s+(.*)/);
      if (optMatch) {
        options.push({ letter: optMatch[1], text: optMatch[2] });
        continue;
      }

      if (line.toLowerCase().startsWith("correct answer")) {
        const answerMatch = line.match(/correct answer:\s*([A-D])[\.\)]?\s*(.*)/i);
        if (answerMatch) {
          correctAnswerLetter = answerMatch[1];
          correctAnswer = answerMatch[2];
        }
        continue;
      }

      if (
        !line.toLowerCase().startsWith("here is") &&
        !line.toLowerCase().startsWith("explanation")
      ) {
        questionLines.push(line);
      }
    }

    const questionText = questionLines.join(" ").trim();

    return {
      question: questionText,
      options: options.map((opt) => opt.text),
      answer: correctAnswer,
    };
  }

  // Fetch question from API
  async function fetchAIQuestion(topic, difficulty) {
    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty }),
      });
      const data = await response.json();
      return parseAIQuestion(data.questionText);
    } catch (err) {
      console.error("AI fetch error:", err);
      return {
        question: "Unable to load question. Please try again.",
        options: ["-", "-", "-", "-"],
        answer: "-",
      };
    }
  }

  // Load question
  async function loadQuestion() {
    const q = await fetchAIQuestion("aptitude", currentLevel);
    setQuestion(q.question);
    setOptions(q.options);
    setSelectedOption(null);
  }

  useEffect(() => {
    if (!quizCompleted) {
      loadQuestion();
    }
  }, [questionCount, currentLevel, quizCompleted]);

  // Adjust difficulty
  function adjustDifficulty(isCorrect, confidenceLevel) {
    if (isCorrect && confidenceLevel === "high") {
      if (currentLevel === "easy") setCurrentLevel("medium");
      else if (currentLevel === "medium") setCurrentLevel("hard");
    } else if (!isCorrect && (confidenceLevel === "low" || confidenceLevel === "medium")) {
      if (currentLevel === "hard") setCurrentLevel("medium");
      else if (currentLevel === "medium") setCurrentLevel("easy");
    }
  }

  // Handle next button click
  function handleNext() {
    if (!selectedOption) {
      alert("Please select an option.");
      return;
    }

    const correctAnswer = options.find(
      (opt, idx) => opt === options[options.findIndex((o) => o === selectedOption)]
    );
    const isCorrect = selectedOption === correctAnswer;
    if (isCorrect) setScore(score + 1);

    // Update confidence stats
    setConfidenceStats((prevStats) => {
      const newStats = { ...prevStats };
      newStats[confidence].total += 1;
      if (isCorrect) newStats[confidence].correct += 1;
      return newStats;
    });

    adjustDifficulty(isCorrect, confidence);

    if (questionCount + 1 >= totalQuestions) {
      setQuizCompleted(true);
    } else {
      setQuestionCount(questionCount + 1);
    }
  }

  // Generate insights
  function generateInsight() {
    const insights = [];
    function getAccuracy(stat) {
      return stat.total === 0 ? 0 : ((stat.correct / stat.total) * 100).toFixed(1);
    }

    if (getAccuracy(confidenceStats.high) >= 70) {
      insights.push("✅ You're doing well when you're confident!");
    } else if (confidenceStats.high.total > 0) {
      insights.push("⚠️ Accuracy drops when you're confident — try reviewing those topics.");
    }

    if (confidenceStats.medium.total > 0 && getAccuracy(confidenceStats.medium) < 50) {
      insights.push("📘 Your medium confidence answers need work.");
    }

    if (confidenceStats.low.total > 0 && getAccuracy(confidenceStats.low) > 60) {
      insights.push("🔍 You're underconfident — you're performing better than you think!");
    }

    if (insights.length === 0) {
      insights.push("👍 Great effort! Keep practicing to improve even more.");
    }

    return insights;
  }

  // Handle retry
  function handleRetry() {
    setScore(0);
    setQuestionCount(0);
    setCurrentLevel("medium");
    setResults([]);
    setConfidenceStats({
      high: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      low: { correct: 0, total: 0 },
    });
    setQuizCompleted(false);
  }

  return (
    <div className="bg-gray-100 text-gray-900 font-sans min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl quiz-card p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Adaptive Quiz Generator</h1>

        {!quizCompleted ? (
          <>
            <div id="questionBox" className="mb-4 text-lg font-medium">
              {question}
            </div>

            <div id="optionsBox" className="flex flex-col space-y-2 mb-4">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`option-btn w-full text-left px-4 py-2 border rounded-md hover:bg-blue-100 ${
                    selectedOption === opt ? "bg-blue-300 text-white border-blue-600" : ""
                  }`}
                  onClick={() => setSelectedOption(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label htmlFor="confidence" className="block font-medium mb-1">
                How confident are you in your answer?
              </label>
              <select
                id="confidence"
                className="w-full border border-gray-300 p-2 rounded-md"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button
              id="nextBtn"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              onClick={handleNext}
            >
              Next
            </button>

            <div id="progress" className="mt-4 text-left text-gray-800 text-sm">
              Question {questionCount + 1} of {totalQuestions}
            </div>
          </>
        ) : (
          <div>
            <div className="result-box">
              <div className="result-score">
                Score: {score} / {totalQuestions}
              </div>
              <div className="font-semibold mt-4 mb-2 text-lg">Confidence Breakdown</div>
              <div className="breakdown-item high">
                High: {confidenceStats.high.correct} / {confidenceStats.high.total} correct (
                {confidenceStats.high.total === 0
                  ? 0
                  : ((confidenceStats.high.correct / confidenceStats.high.total) * 100).toFixed(1)}
                %)
              </div>
              <div className="breakdown-item medium">
                Medium: {confidenceStats.medium.correct} / {confidenceStats.medium.total} correct (
                {confidenceStats.medium.total === 0
                  ? 0
                  : ((confidenceStats.medium.correct / confidenceStats.medium.total) * 100).toFixed(1)}
                %)
              </div>
              <div className="breakdown-item low">
                Low: {confidenceStats.low.correct} / {confidenceStats.low.total} correct (
                {confidenceStats.low.total === 0
                  ? 0
                  : ((confidenceStats.low.correct / confidenceStats.low.total) * 100).toFixed(1)}
                %)
              </div>
              <div className="mt-4 font-semibold text-lg">📊 Insights</div>
              <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
                {generateInsight().map((insight, idx) => (
                  <li key={idx}>• {insight}</li>
                ))}
              </ul>
              <button
                id="retryBtn"
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                onClick={handleRetry}
              >
                🔄 Retake Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
