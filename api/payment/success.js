export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send(`요청 값 누락: paymentKey=${paymentKey}, orderId=${orderId}, amount=${amount}`);
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  // 🚨 만약 Vercel에 비밀번호 세팅이 안 되어있다면 여기서 딱 걸립니다!
  if (!secretKey) {
    return res.status(500).send("🚨 범인 발견: Vercel 환경변수(TOSS_SECRET_KEY)가 비어있습니다! Vercel 세팅에서 Production 체크가 풀려있는지 확인하십쇼!");
  }

  const encryptedSecretKey = Buffer.from(secretKey + ':').toString('base64');

  try {
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: paymentKey,
        orderId: orderId,
        amount: Number(amount),
      }),
    });

    if (response.ok) {
      res.redirect(302, '/?paid=true');
    } else {
      // 🚨 토스가 승인을 거절하면 홈으로 안 가고 화면에 에러 이유를 띄웁니다!
      const errorData = await response.json();
      return res.status(400).send(`🚨 토스 에러 발생: ${JSON.stringify(errorData)}`);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 에러: ${error.message}`);
  }
}
