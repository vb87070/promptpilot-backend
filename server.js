require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PromptPilot API' });
});

app.post('/generate-prompt', async (req, res) => {
  try {
    const { user_input } = req.body;
    if (!user_input) return res.status(400).json({ error: 'user_input is required' });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    const genRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'You are a professional prompt engineer. Generate a high-quality AI prompt for: ' + user_input + '. Include role definition, clear instructions, output format. Return ONLY the final prompt.' }] }] })
    });
    const genData = await genRes.json();
    if (genData.error) throw new Error(genData.error.message);
    const generatedPrompt = genData.candidates[0].content.parts[0].text.trim();
    const scoreRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Score this prompt 1-10 for clarity, structure, effectiveness. Return ONLY a single number: ' + generatedPrompt }] }] })
    });
    const scoreData = await scoreRes.json();
    const score = Math.min(10, Math.max(1, parseInt(scoreData.candidates[0].content.parts[0].text.match(/\d+/)?.[0] || '5')));
    res.status(201).json({ success: true, data: { user_input, generated_prompt: generatedPrompt, score } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('✦ PromptPilot API running on http://localhost:' + PORT);
});