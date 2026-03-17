import { Buffer } from 'buffer';

export const config = { api: { bodyParser: false } };
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  // 1. "음" 소리 제거! 텍스트는 아주 깨끗하게 유지합니다.
  const lullabyTexts = {
    ko: "우리 아기 예쁜 아기. 엄마가 항상 지켜줄게. 자장 자장 우리 아기, 이제 코오 자자.",
    en: "My sweet baby, my lovely child. Mommy will always protect you. Sleep tight, my dear, now go to sleep.",
    tr: "Canım bebeğim, tatlı yavrum. Annen seni her zaman koruyacak. Ninni ninni bebeğim, hadi uyu artık."
  };

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = `data:application/octet-stream;base64,${audioBuffer.toString('base64')}`;

    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e",
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio,
          speed: 0.88, // 나긋나긋한 속도
          cleanup_voice: false 
        }
      })
    });

    const prediction = await startResponse.json();
    if (!prediction.id) throw new Error("AI 호출 실패");

    const predictionId = prediction.id;
    let currentPrediction = prediction;

    let retryCount = 0;
    while (currentPrediction.status !== "succeeded" && currentPrediction.status !== "failed" && retryCount < 40) {
      await sleep(1500);
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      currentPrediction = await checkRes.json();
      retryCount++;
    }

    const audioRes = await fetch(currentPrediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
