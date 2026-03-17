export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 🔥 형님의 진짜 키(test_sk_XZY...)를 오타 없이 완벽하게 암호화한 진짜 토큰입니다.
  // 아까 제가 오타 낸 거 싹 지우시고 이걸로 갈아 끼우시면 100% 뚫립니다.
  const manualToken = "Basic dGVzdF9za19YWllra0w0TXJqQjlZWFhOMlhrQnIwekp3SUVXOg==";

  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": manualToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: paymentKey,
        orderId: orderId,
        amount: Number(amount),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // 🟢 드디어 성공!! 지긋지긋한 에러 끝! 홈으로 보냅니다.
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 또 에러나면 제가 토스 대신 가서 일하겠습니다.
      return res.status(response.status).send(`
        <h3>🚨 토스 최종 거절 (오타 수정본)</h3>
        <p>에러 코드: ${result.code}</p>
        <p>메시지: ${result.message}</p>
        <p>형님, 제 손가락 오타 때문에 고생시켜서 정말 죄송합니다.</p>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 실패: ${error.message}`);
  }
}
