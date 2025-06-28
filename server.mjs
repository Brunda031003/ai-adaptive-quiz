import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // serve index.html, script.js

app.post('/api/groq', async (req, res) => {
  const { topic, difficulty } = req.body;

  const prompt = `Generate a ${difficulty}-difficulty ${topic} multiple-choice question for placement. Provide 4 options labeled A–D, clearly mention the correct answer.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are a quiz question generator for placement preparation.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    res.status(200).json({ questionText: content });
  } catch (err) {
    console.error("Groq API Error:", err);
    res.status(500).json({ error: "Failed to fetch AI question" });
  }
});

app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
