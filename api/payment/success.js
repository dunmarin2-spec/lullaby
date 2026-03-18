export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  // 1. 데이터가 비어있으면 바로 컷
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("결제 승인 데이터가 부족합니다.");
  }

  // 2. [범인 검거] 형님의 진짜 시크릿 키 (대문자 K 확인 완료)
  // 뒤에 콜론(:)을 붙여서 암호화해야 하는 토스 규칙을 코드로 구현했습니다.
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwIEW";
  
  // 3. 토스 표준 인증 토큰 생성 (SecretKey: 를 Base64로 변환)
  const basicToken = Buffer.from(secretKey + ":", "utf-8").toString("base64");

  try {
    // 4. 토스 서버에 최종 승인 요청
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + basicToken,
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
      // 🟢 [대성공] 드디어 결제 완료! VIP 꼬리표 달고 홈으로 보냅니다.
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 [승인 거절] 에러 원인을 화면에 뿌려줍니다.
      return res.status(response.status).send(`
        <div style="padding:20px; font-family:sans-serif;">
          <h2>🚨 토스 승인 거절</h2>
          <p><b>에러코드:</b> ${result.code}</p>
          <p><b>메시지:</b> ${result.message}</p>
          <hr>
          <p>형님, 만약 UNAUTHORIZED_KEY가 또 뜨면 진짜로 키 짝꿍이 안 맞는 겁니다.</p>
          <p>현재 사용된 시크릿 키: ${secretKey}</p>
        </div>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 실패: ${error.message}`);
  }
}
