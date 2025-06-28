const questionBox = document.getElementById("questionBox");
const optionsBox = document.getElementById("optionsBox");
const confidenceSelect = document.getElementById("confidence");
const nextBtn = document.getElementById("nextBtn");
const progress = document.getElementById("progress");
// Confidence level tracking
const confidenceStats = {
  high: { correct: 0, total: 0 },
  medium: { correct: 0, total: 0 },
  low: { correct: 0, total: 0 }
};


let currentLevel = "medium"; // Starting difficulty
let score = 0;
let totalQuestions = 5;
let questionCount = 0;
let results = [];

let currentQuestion = null;

// === Parse AI-generated Question Text ===
function parseAIQuestion(text) {
  const lines = text.trim().split('\n');

  let questionLines = [];
  let options = [];
  let correctAnswerLetter = '';
  let correctAnswer = '';

  for (let line of lines) {
    line = line.trim();

    // Extract options like A) 40%
    const optMatch = line.match(/^([A-D])[\.\)]\s+(.*)/);
    if (optMatch) {
      options.push({ letter: optMatch[1], text: optMatch[2] });
      continue;
    }

    // Extract correct answer like: Correct answer: C) 67%
    if (line.toLowerCase().startsWith("correct answer")) {
      const answerMatch = line.match(/correct answer:\s*([A-D])[\.\)]?\s*(.*)/i);
      if (answerMatch) {
        correctAnswerLetter = answerMatch[1];
        correctAnswer = answerMatch[2];
      }
      continue;
    }

    // Collect question text (before options start)
    if (!line.toLowerCase().startsWith("here is") && !line.toLowerCase().startsWith("explanation")) {
      questionLines.push(line);
    }
  }

  const question = questionLines.join(' ').trim();

  return {
    question,
    options: options.map(opt => opt.text),
    answer: correctAnswer
  };
}



// === Fetch Question from Groq AI ===
async function fetchAIQuestion(topic, difficulty) {
  try {
    const response = await fetch('http://localhost:3000/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty })
    });

    const data = await response.json();

    // 🔍 Log the raw response from Groq before parsing
    console.log("Raw AI Response:\n", data.questionText);

    return parseAIQuestion(data.questionText);
  } catch (err) {
    console.error("AI fetch error:", err);
    return {
      question: "Unable to load question. Please try again.",
      options: ["-", "-", "-", "-"],
      answer: "-"
    };
  }
}


// === Load Question to UI ===
async function loadQuestion() {
  currentQuestion = await fetchAIQuestion("aptitude", currentLevel); // Default to aptitude
  questionBox.textContent = currentQuestion.question;
  optionsBox.innerHTML = "";

  currentQuestion.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "w-full text-left px-4 py-2 border rounded-md hover:bg-blue-100";
    btn.onclick = () => {
      document.querySelectorAll("#optionsBox button").forEach(b => b.classList.remove("bg-blue-300"));
      btn.classList.add("bg-blue-300");
      btn.dataset.selected = opt;
    };
    optionsBox.appendChild(btn);
  });

  progress.textContent = `Question ${questionCount + 1} of ${totalQuestions}`;
}



// === Show Final Result with Breakdown ===
function showResult() {
  questionBox.textContent = "🎉 Quiz completed!";
  optionsBox.innerHTML = "";
  nextBtn.style.display = "none";
  confidenceSelect.parentElement.style.display = "none";

  const high = confidenceStats.high;
  const medium = confidenceStats.medium;
  const low = confidenceStats.low;

  function getAccuracy(stat) {
    return stat.total === 0 ? 0 : ((stat.correct / stat.total) * 100).toFixed(1);
  }

  function generateInsight() {
    const insights = [];
    if (getAccuracy(high) >= 70) {
      insights.push("✅ You're doing well when you're confident!");
    } else if (high.total > 0) {
      insights.push("⚠️ Accuracy drops when you're confident — try reviewing those topics.");
    }

    if (medium.total > 0 && getAccuracy(medium) < 50) {
      insights.push("📘 Your medium confidence answers need work.");
    }

    if (low.total > 0 && getAccuracy(low) > 60) {
      insights.push("🔍 You're underconfident — you're performing better than you think!");
    }

    if (insights.length === 0) {
      insights.push("👍 Great effort! Keep practicing to improve even more.");
    }

    return insights.map(i => `<li>• ${i}</li>`).join("");
  }

  const resultHTML = `
    <div class="result-box">
      <div class="result-score">Score: ${score}/${totalQuestions}</div>
      <div class="font-semibold mt-4 mb-2 text-lg">Confidence Breakdown</div>
      <div class="breakdown-item high">High: ${high.correct}/${high.total} correct (${getAccuracy(high)}%)</div>
      <div class="breakdown-item medium">Medium: ${medium.correct}/${medium.total} correct (${getAccuracy(medium)}%)</div>
      <div class="breakdown-item low">Low: ${low.correct}/${low.total} correct (${getAccuracy(low)}%)</div>
      <div class="mt-4 font-semibold text-lg">📊 Insights</div>
      <ul class="list-disc list-inside mt-2 text-sm text-gray-700">${generateInsight()}</ul>
    
      <button id="retryBtn" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
  🔄 Retake Quiz
</button>
  
      </div>
  `;

  // 💡 This is what was missing in your current setup
  progress.innerHTML = resultHTML;
}

document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "retryBtn") {
    // Reset all variables
    score = 0;
    questionCount = 0;
    currentLevel = "medium";
    currentQuestion = null;

    confidenceStats.high = { correct: 0, total: 0 };
    confidenceStats.medium = { correct: 0, total: 0 };
    confidenceStats.low = { correct: 0, total: 0 };

        // Restore UI elements
    confidenceSelect.parentElement.style.display = "block";
    nextBtn.style.display = "block";

    // Disable category once quiz starts again
    categorySelect.disabled = true;

    // Load first question again
    loadQuestion();
  }
});

// === Adjust Difficulty Level ===
function adjustDifficulty(isCorrect, confidence) {
  if (isCorrect && confidence === "high") {
    if (currentLevel === "easy") currentLevel = "medium";
    else if (currentLevel === "medium") currentLevel = "hard";
  } else if (!isCorrect && (confidence === "low" || confidence === "medium")) {
    if (currentLevel === "hard") currentLevel = "medium";
    else if (currentLevel === "medium") currentLevel = "easy";
  }
}

// === Handle Next Button Click ===
nextBtn.addEventListener("click", () => {
  const selectedBtn = document.querySelector("#optionsBox button.bg-blue-300");
  if (!selectedBtn) {
    alert("Please select an option.");
    return;
  }

  const selected = selectedBtn.dataset.selected;
  const correct = currentQuestion.answer;
  const confidence = confidenceSelect.value;
  const isCorrect = selected === correct;

  if (isCorrect) score++;

  // update confidenceStats etc...

  questionCount++;
  if (questionCount >= totalQuestions) {
    showResult();
  } else {
    loadQuestion();
  }
});


// === Start the Quiz ===
loadQuestion();

