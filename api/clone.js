import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

// 지연 함수 (Polling용)
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  // 1. 안드로이드 앱/브라우저 접근 허용 (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 🚨 [주의] 진짜 토큰(r8_...)은 코드가 아니라 Vercel 'Environment Variables' 설정에 넣으세요!
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  const lullabyTexts = {
    ko: "우리 아기... 예쁜 아기... 엄마가 항상 지켜줄게... 자장, 자장... 우리 아기... 코오, 자자.",
    en: "My sweet baby... My lovely child... Mommy will always protect you... Sleep tight, my dear... Close your eyes... and go to sleep.",
    tr: "Canım bebeğim... Tatlı yavrum... Annen seni her zaman koruyacak... Ninni, ninni... Hadi uyu bebeğim... tatlı rüyalar gör."
  };

  try {
    // 2. 스마트폰에서 넘어온 녹음 데이터 합치기
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);
    
    // Replicate가 읽을 수 있도록 Base64 포맷으로 변환
    const base64Audio = `data:application/octet-stream;base64,${audioBuffer.toString('base64')}`;

    // 3. Replicate AI에게 자장가 생성 요청 (XTTS-v2 모델)
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "6b16e4549f64923e38712a6f20b3272d1748f21908dfdf649e4d580f4f727690",
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio,
          cleanup_voice: true
        }
      })
    });

    let prediction = await startResponse.json();
    if (!prediction.id) throw new Error("Replicate 요청 실패: " + JSON.stringify(prediction));

    const predictionId = prediction.id;

    // 4. 결과가 나올 때까지 기다리기 (Polling)
    // AI가 목소리 복제하는 데 보통 5~10초 정도 걸립니다.
    let retryCount = 0;
    while (prediction.status !== "succeeded" && prediction.status !== "failed" && retryCount < 30) {
      await sleep(1500); 
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      prediction = await checkRes.json();
      retryCount++;
    }

    if (prediction.status === "failed") throw new Error("AI 생성 실패");
    if (retryCount >= 30) throw new Error("생성 시간 초과");

    // 5. 완성된 오디오 URL에서 실제 파일 가져오기
    const audioRes = await fetch(prediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    // 6. 퐁비님 스마트폰 앱으로 오디오 쏴주기
    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    console.error("Fatal Error:", error);
    res.status(500).json({ error: error.message });
  }
}
