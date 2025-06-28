export default async function handler(req, res) {
  const { topic, difficulty } = req.body;

  const prompt = `Generate a ${difficulty}-difficulty ${topic} multiple-choice question for placement. Provide 4 options labeled A–D, clearly mention the correct answer.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
       'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192', // or mistral-7b
      messages: [
        { role: 'system', content: 'You are a quiz question generator for placement preparation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  res.status(200).json({ questionText: content });
}
