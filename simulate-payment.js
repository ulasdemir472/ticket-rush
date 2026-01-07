// simulate-payment.js

// ⚠️ BURALARI DOLDUR: Az önce kilitlediğin (LOCKED) koltuğun ve kullanıcının ID'si
const SEAT_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"; 
const USER_ID = "220ec58a-b0f2-5bc5-9404-d977e924c9e2";

async function payForTicket() {
  console.log("💳 Ödeme işlemi simüle ediliyor...");
  
  try {
    const res = await fetch('http://localhost:3000/api/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        seatId: SEAT_ID, 
        userId: USER_ID 
      })
    });

    const data = await res.json();

    if (res.status === 200) {
      console.log("✅ Ödeme Başarılı! Koltuk SATILDI.");
      console.log("📨 Beklenen: RabbitMQ 'ticket_generation_queue' tetiklenmeli.");
      console.log("⚙️  Beklenen: Worker PDF üretmeli.");
      console.log("📄 Sunucu Yanıtı:", data);
    } else {
      console.error("❌ Ödeme Başarısız:", data);
    }
  } catch (error) {
    console.error("💥 Bağlantı Hatası:", error);
  }
}

payForTicket();