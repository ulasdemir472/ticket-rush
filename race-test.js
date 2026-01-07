// race-test.js
const SEAT_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const EVENT_ID = "a20e463d-4c8e-5bfe-8aec-1c0e8c4edb7e";

// İki farklı kullanıcı
const USER_A_ID = "110ec58a-a0f2-4ac4-8393-c866d813b8d1";
const USER_B_ID = "220ec58a-b0f2-5bc5-9404-d977e924c9e2";

async function buyTicket(userId, name) {
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/v1/seats/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: SEAT_ID, userId: userId })
    });

    const data = await res.json();
    const duration = Date.now() - start;
    
    console.log(`👤 ${name} İstek Sonucu:`);
    console.log(`   Status: ${res.status}`); // 200 veya 409 dönmeli
    console.log(`   Süre: ${duration}ms`);
    console.log(`   Mesaj: ${JSON.stringify(data)}\n`);
    
  } catch (error) {
    console.error(`❌ ${name} Hata aldı:`, error);
  }
}

console.log("🏁 YARIŞ BAŞLIYOR: İki kullanıcı aynı anda butona basıyor...\n");

// Promise.all ile istekleri PARALEL gönderiyoruz (sıralı değil!)
Promise.all([
  buyTicket(USER_A_ID, "Kullanıcı A"),
  buyTicket(USER_B_ID, "Kullanıcı B")
]);