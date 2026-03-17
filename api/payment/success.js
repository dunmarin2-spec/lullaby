export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터가 부족합니다.");
  }

  // 1. 형님의 테스트 시크릿 키 (공백 없는지 다시 확인!)
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwIEW";
  
  // 2. 토스 인증 헤더 만들기 (가장 안전한 방식)
  const basicToken = Buffer.from(`${secretKey}:`, "utf-8").toString("base64");

  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicToken}`,
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
      // 🟢 드디어 성공! VIP 전용 화면으로 쏩니다!
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 또 에러나면 토스가 준 진짜 원본 메시지를 띄웁니다.
      return res.status(response.status).send(`
        <h3>🚨 토스 승인 거절</h3>
        <p>에러 코드: ${result.code}</p>
        <p>메시지: ${result.message}</p>
        <br>
        <p>형님, 만약 또 UNAUTHORIZED_KEY가 뜨면 토스 개발자센터에서 '비밀번호 재발급' 한 번만 받으셔야 합니다!</p>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 실패: ${error.message}`);
  }
}
