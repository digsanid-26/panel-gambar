import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// This endpoint seeds demo data.
// Call once: POST /api/seed
export async function POST() {
  try {
    const passwordHash = await bcrypt.hash("demo1234", 10);

    // Create demo teacher account (upsert)
    const teacher = await prisma.user.upsert({
      where: { email: "guru@demo.id" },
      update: {},
      create: {
        email: "guru@demo.id",
        name: "Bu Ratna Demo",
        role: "guru",
        passwordHash,
      },
    });

    const teacherId = teacher.id;

    // Create demo student account (upsert)
    await prisma.user.upsert({
      where: { email: "siswa@demo.id" },
      update: {},
      create: {
        email: "siswa@demo.id",
        name: "Andi Demo",
        role: "siswa",
        passwordHash,
      },
    });

    // Skip if stories already seeded
    const existingStory = await prisma.story.findFirst({ where: { authorId: teacherId } });
    if (existingStory) {
      return NextResponse.json({ message: "Demo data already seeded." });
    }

    // Create demo story
    const story = await prisma.story.create({
      data: {
        title: "Kelinci yang Rajin",
        description:
          "Cerita tentang Kelinci yang selalu rajin dan suka membantu teman-temannya. Cocok untuk siswa kelas 1-2 SD.",
        theme: "moral",
        level: "dasar",
        targetClass: "Kelas 1-2",
        status: "published",
        authorId: teacherId,
      },
    });

    // Create panels
    const panelInputs = [
      { orderIndex: 0, backgroundColor: "#fef3c7", narrationText: "Pagi hari yang cerah. Matahari bersinar dengan hangat. Kelinci bangun dari tidurnya dengan penuh semangat." },
      { orderIndex: 1, backgroundColor: "#dbeafe", narrationText: "Kelinci selalu merapikan tempat tidurnya sendiri setiap pagi. Ibu Kelinci sangat bangga melihatnya." },
      { orderIndex: 2, backgroundColor: "#d1fae5", narrationText: "Di jalan menuju sekolah, Kelinci bertemu sahabatnya, Kura-kura. Mereka selalu berangkat bersama." },
      { orderIndex: 3, backgroundColor: "#fef3c7", narrationText: "Di kelas, Kelinci selalu aktif menjawab pertanyaan Bu Guru. Teman-teman kagum dengan semangatnya." },
      { orderIndex: 4, backgroundColor: "#fce7f3", narrationText: "Sepulang sekolah, Kelinci membantu Kura-kura yang kesulitan membawa buku-buku yang berat." },
      { orderIndex: 5, backgroundColor: "#e0e7ff", narrationText: '"Membaca itu menyenangkan!" kata Kelinci. Kelinci memang rajin!' },
    ];

    const panels = await Promise.all(
      panelInputs.map((p) => prisma.panel.create({ data: { storyId: story.id, ...p } }))
    );

    // Create dialogs
    await prisma.dialog.createMany({
      data: [
        { panelId: panels[0].id, orderIndex: 0, characterName: "Kelinci", characterColor: "#f59e0b", text: "Selamat pagi, Matahari! Hari ini aku akan rajin lagi!", bubbleStyle: "kotak", positionX: 60, positionY: 25 },
        { panelId: panels[1].id, orderIndex: 0, characterName: "Ibu Kelinci", characterColor: "#ec4899", text: "Wah, rajin sekali kamu, Nak! Ibu bangga!", bubbleStyle: "oval", positionX: 30, positionY: 20 },
        { panelId: panels[1].id, orderIndex: 1, characterName: "Kelinci", characterColor: "#f59e0b", text: "Terima kasih, Bu! Merapikan tempat tidur itu mudah, kok!", bubbleStyle: "kotak", positionX: 70, positionY: 50 },
        { panelId: panels[2].id, orderIndex: 0, characterName: "Kelinci", characterColor: "#f59e0b", text: "Hai, Kura-kura! Ayo kita ke sekolah bersama!", bubbleStyle: "kotak", positionX: 35, positionY: 20 },
        { panelId: panels[2].id, orderIndex: 1, characterName: "Kura-kura", characterColor: "#10b981", text: "Ayo, Kelinci! Aku sudah siap! Tunggu aku, ya!", bubbleStyle: "oval", positionX: 70, positionY: 45 },
        { panelId: panels[3].id, orderIndex: 0, characterName: "Kelinci", characterColor: "#f59e0b", text: "Saya tahu jawabannya, Bu Guru!", bubbleStyle: "ledakan", positionX: 55, positionY: 20 },
        { panelId: panels[4].id, orderIndex: 0, characterName: "Kura-kura", characterColor: "#10b981", text: "Aduh, buku-buku ini berat sekali...", bubbleStyle: "awan", positionX: 30, positionY: 20 },
        { panelId: panels[4].id, orderIndex: 1, characterName: "Kelinci", characterColor: "#f59e0b", text: "Sini, biar aku bantu! Teman harus saling membantu!", bubbleStyle: "kotak", positionX: 70, positionY: 45 },
        { panelId: panels[4].id, orderIndex: 2, characterName: "Kura-kura", characterColor: "#10b981", text: "Terima kasih banyak, Kelinci! Kamu memang sahabat terbaik!", bubbleStyle: "oval", positionX: 35, positionY: 70 },
        { panelId: panels[5].id, orderIndex: 0, characterName: "Kelinci", characterColor: "#f59e0b", text: "Membaca itu menyenangkan! Buku ini seru sekali!", bubbleStyle: "kotak", positionX: 55, positionY: 25 },
      ],
    });

    // Create a second story
    const story2 = await prisma.story.create({
      data: {
        title: "Petualangan di Taman Sekolah",
        description: "Dina dan teman-temannya menemukan taman rahasia di belakang sekolah.",
        theme: "petualangan",
        level: "menengah",
        targetClass: "Kelas 3-4",
        status: "published",
        authorId: teacherId,
      },
    });

    const s2Panels = await Promise.all([
      prisma.panel.create({ data: { storyId: story2.id, orderIndex: 0, backgroundColor: "#dcfce7", narrationText: "Suatu hari, saat istirahat, Dina melihat seekor kupu-kupu cantik." } }),
      prisma.panel.create({ data: { storyId: story2.id, orderIndex: 1, backgroundColor: "#fef9c3", narrationText: '"Ayo kita lihat ke mana dia pergi!" kata Dina.' } }),
      prisma.panel.create({ data: { storyId: story2.id, orderIndex: 2, backgroundColor: "#e0f2fe", narrationText: "Di balik pagar, mereka menemukan taman kecil yang indah." } }),
    ]);

    await prisma.dialog.createMany({
      data: [
        { panelId: s2Panels[0].id, orderIndex: 0, characterName: "Dina", characterColor: "#8b5cf6", text: "Wah, lihat kupu-kupu itu! Cantik sekali!", bubbleStyle: "kotak", positionX: 40, positionY: 25 },
        { panelId: s2Panels[1].id, orderIndex: 0, characterName: "Dina", characterColor: "#8b5cf6", text: "Riko, ayo kita ikuti kupu-kupu itu!", bubbleStyle: "kotak", positionX: 35, positionY: 20 },
        { panelId: s2Panels[1].id, orderIndex: 1, characterName: "Riko", characterColor: "#0ea5e9", text: "Baiklah! Tapi kita harus hati-hati, ya!", bubbleStyle: "oval", positionX: 65, positionY: 50 },
        { panelId: s2Panels[2].id, orderIndex: 0, characterName: "Dina", characterColor: "#8b5cf6", text: "Lihat, Riko! Ada taman rahasia di sini! Indah sekali!", bubbleStyle: "ledakan", positionX: 50, positionY: 20 },
        { panelId: s2Panels[2].id, orderIndex: 1, characterName: "Riko", characterColor: "#0ea5e9", text: "Luar biasa! Kita harus ceritakan ini ke teman-teman!", bubbleStyle: "kotak", positionX: 55, positionY: 55 },
      ],
    });

    // Create classroom
    await prisma.classroom.create({
      data: { name: "Kelas 2A - Demo", code: "DEMO2A", teacherId },
    });

    return NextResponse.json({
      message: "Demo data seeded successfully!",
      accounts: {
        teacher: { email: "guru@demo.id", password: "demo1234" },
        student: { email: "siswa@demo.id", password: "demo1234" },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
