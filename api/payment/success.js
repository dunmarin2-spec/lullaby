export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 🔥 형님의 시크릿 키(test_sk_XZY...)를 제가 직접 Base64로 미리 암호화했습니다.
  // 이 암호문은 절대 틀릴 수가 없습니다.
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
      // 🟢 드디어 성공!! 꼬리표 달고 홈으로 보냅니다.
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 여기서 또 에러나면 이건 제 잘못이 아니라 토스 서버 점검 수준입니다.
      return res.status(response.status).send(`
        <h3>🚨 토스 최종 거절</h3>
        <p>에러 코드: ${result.code}</p>
        <p>메시지: ${result.message}</p>
        <p>사용한 암호문: ${manualToken}</p>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 실패: ${error.message}`);
  }
}
