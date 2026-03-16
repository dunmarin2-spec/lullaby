import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  // 1. CORS 설정 (기존과 동일)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const replicateToken = process.env.REPLICATE_API_TOKEN; // 👈 Vercel에 새로 등록할 키!
  const lang = req.headers['x-lang'] || 'ko';

  // 🚨 XTTS-v2는 SSML(<break>)을 지원하지 않습니다. 쉼표(,)나 마침표(.)로 자연스럽게 띄어 읽습니다.
  const lullabyTexts = {
    ko: "우리 아기... 예쁜 아기... 엄마가 항상 지켜줄게... 자장, 자장... 우리 아기... 코오, 자자.",
    en: "My sweet baby... My lovely child... Mommy will always protect you... Sleep tight, my dear... Close your eyes... and go to sleep.",
    tr: "Canım bebeğim... Tatlı yavrum... Annen seni her zaman koruyacak... Ninni, ninni... Hadi uyu bebeğim... tatlı rüyalar gör."
  };

  try {
    // 2. 스마트폰 녹음 파일 받기
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);
    
    // Replicate에 파일을 보내기 위해 Base64로 변환합니다.
    const base64Audio = `data:application/octet-stream;base64,${audioBuffer.toString('base64')}`;

    // 3. Replicate AI에게 작업 요청 (목소리 추가/삭제 과정 없음!)
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // XTTS-v2 공식 모델 주소
        version: "6b16e4549f64923e38712a6f20b3272d1748f21908dfdf649e4d580f4f727690",
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio, // 👈 녹음 파일 즉석 스캔
          cleanup_voice: true
        }
      })
    });

    let prediction = await startResponse.json();
    const predictionId = prediction.id;

    // 4. 결과가 나올 때까지 기다리기 (Polling)
    // Replicate는 비동기라 1~2초 간격으로 "다 됐니?" 물어봐야 합니다.
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await sleep(1500); // 1.5초 대기
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      prediction = await checkRes.json();
    }

    if (prediction.status === "failed") throw new Error("AI 생성 실패");

    // 5. 완성된 자장가(URL)를 가져와서 프론트로 쏴주기
    const audioRes = await fetch(prediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav'); // XTTS는 보통 wav를 뱉습니다.
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
