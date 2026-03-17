export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("잘못된 결제 요청입니다.");
  }

  // 🔥 범인은 Vercel 환경변수였습니다! 
  // Vercel 금고 거치지 않고, 그냥 코드에 테스트 시크릿 키를 다이렉트로 박아버립니다. (테스트라 100% 안전)
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwIEW";
  
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
      // 🟢 드디어 결제 최종 승인 완료! 형님 앞마당으로 돌려보냅니다!
      res.redirect(302, '/?paid=true');
    } else {
      const errorData = await response.json();
      return res.status(400).send(`🚨 토스 에러 발생 (코드 박았는데도 에러면 기적입니다): ${JSON.stringify(errorData)}`);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 에러: ${error.message}`);
  }
}
