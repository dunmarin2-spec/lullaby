import { Buffer } from 'buffer';
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  // 🔥 형님, 여기서 Vercel이 무슨 열쇠를 쓰는지 로그에 찍습니다!
  console.log("🔑 현재 Vercel이 쓰는 열쇠 앞 4자리:", apiKey ? apiKey.substring(0, 4) : "없음");

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    const formData = new FormData();
    formData.append('name', `Mom_${Date.now()}`);
    formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'rec.mp3');

    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();
    if (!addVoiceRes.ok) {
      console.error('🔥 일레븐랩스 에러 답변:', JSON.stringify(addData));
      return res.status(addVoiceRes.status).json(addData);
    }

    // (이하 생략 - 위쪽 복제 로직만 성공하면 됩니다!)
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
