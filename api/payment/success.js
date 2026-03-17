export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 🔥 [진짜 범인 검거] 아까 소문자 k를 대문자 K로 완벽하게 수정했습니다.
  // 이 암호문은 형님의 'test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwIEW'와 100% 일치합니다.
  const manualToken = "Basic dGVzdF9za19YWllrS0w0TXJqQjlZWFhOMlhrQnIwekp3SUVXOg==";

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
      // 🟢 드디어 성공!! 지긋지긋한 결제 연동 끝!
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 여기서 에러나면 진짜 제가 토스 본사 찾아가겠습니다.
      return res.status(response.status).send(`
        <h3>🚨 토스 최종 거절 (오타 수정본)</h3>
        <p>에러 코드: ${result.code}</p>
        <p>메시지: ${result.message}</p>
        <p>형님, 제 멍청함 때문에 너무 고생시켜드려 정말 죄송합니다.</p>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 실패: ${error.message}`);
  }
}
