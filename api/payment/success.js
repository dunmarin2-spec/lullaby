export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  // 1. 데이터 검증
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("결제 정보가 부족합니다.");
  }

  // 2. 형님 화면에 떠 있는 그 시크릿 키 (공백 절대 없게!)
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwIEW";

  // 3. 토스가 요구하는 인증 토큰 생성 (가장 표준적인 방식)
  const basicToken = Buffer.from(`${secretKey}:`, 'utf-8').toString('base64');

  try {
    // 4. 토스 서버에 최종 승인 요청
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: paymentKey,
        orderId: orderId,
        amount: Number(amount), // 숫자로 확실히 변환
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // 🟢 드디어 성공! VIP 전용 화면으로 쏩니다!
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 에러 발생 시 원인 분석용 메시지 출력
      return res.status(response.status).send(`
        <h3>🚨 토스 승인 거절</h3>
        <p>에러 코드: ${result.code}</p>
        <p>메시지: ${result.message}</p>
        <p>형님, 이 메시지가 보인다면 서버 통신은 성공한 건데 키가 안 먹는 겁니다.</p>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 에러: ${error.message}`);
  }
}
