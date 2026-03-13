export default async function handler(req, res) {
    // 1. 비정상적인 접근 차단 (POST 요청만 허용)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '잘못된 접근입니다.' });
    }

    // 2. 깃허브/Vercel 금고에서 ElevenLabs API 키를 몰래 꺼내옴
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '금고에 API 키가 없습니다! 세팅을 확인해주세요.' });
    }

    try {
        // 3. 일레븐랩스 목소리 ID 세팅
        // (일단 통신 테스트를 위해 일레븐랩스 기본 영어/한국어 지원 목소리 ID를 넣었습니다.
        // 나중에 형님이 엄마 목소리 복제본을 만들면 그 ID로 여기만 쏙 갈아끼우면 됩니다!)
        const voiceId = "pNInz6obbfdqIe1btQcb"; 
        
        // 4. 일레븐랩스 서버에 "이 대사를 이 목소리로 읽어서 MP3로 줘!" 라고 요청
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: "우리 아기 예쁜 아기, 엄마가 항상 지켜줄게. 코장코장 잘 자렴.", // 자장가 대사
                model_id: "eleven_multilingual_v2", // 한국어 발음을 지원하는 최신 AI 모델
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        // 에러가 났을 경우 처리
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }

        // 5. 성공적으로 만들어진 오디오 파일을 형님의 웹 화면으로 전송!
        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error('일레븐랩스 통신 에러:', error);
        res.status(500).json({ error: 'AI 목소리 생성에 실패했습니다.' });
    }
}
