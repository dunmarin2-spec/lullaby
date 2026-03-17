import { Buffer } from 'buffer';

export const config = { api: { bodyParser: false } };
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  const lullabyTexts = {
    ko: "우리.. 아기.... 예쁜.. 아기.... 엄마가.. 항상.. 지켜줄게.... 자장.. 자장.... 우리.. 아기.... 코오.. 자자....",
    en: "My sweet baby... My lovely child... Mommy will always protect you... Sleep tight, my dear... Close your eyes... and go to sleep.",
    tr: "Canım bebeğim... Tatlı yavrum... Annen seni her zaman koruyacak... Ninni, ninni... Hadi uyu bebeğim... tatlı rüyalar gör."
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
        // 🚀 [수정 완료] 캡처 화면에 나온 최신 버전 번호로 교체했습니다!
        version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e", 
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio,
          cleanup_voice: true
        }
      })
    });

    const prediction = await startResponse.json();
    
    if (!prediction.id) {
      console.error("AI 서버 응답:", JSON.stringify(prediction));
      throw new Error(`AI 호출 실패: ${prediction.detail || "권한 또는 버전 문제"}`);
    }

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

    if (currentPrediction.status === "failed") throw new Error("AI 생성 실패: " + JSON.stringify(currentPrediction.error));

    const audioRes = await fetch(currentPrediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    console.error("🔥 최종 에러:", error.message);
    res.status(500).json({ error: error.message });
  }
}
