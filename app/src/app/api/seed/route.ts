import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint seeds demo data. Only works with service role key.
// Call once: POST /api/seed
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Create demo teacher account
    const { data: teacherAuth, error: teacherError } =
      await supabase.auth.admin.createUser({
        email: "guru@demo.id",
        password: "demo1234",
        email_confirm: true,
        user_metadata: { name: "Bu Ratna Demo", role: "guru" },
      });

    if (teacherError && !teacherError.message.includes("already been registered")) {
      throw teacherError;
    }

    const teacherId = teacherAuth?.user?.id;

    // Create demo student account
    const { data: studentAuth, error: studentError } =
      await supabase.auth.admin.createUser({
        email: "siswa@demo.id",
        password: "demo1234",
        email_confirm: true,
        user_metadata: { name: "Andi Demo", role: "siswa" },
      });

    if (studentError && !studentError.message.includes("already been registered")) {
      throw studentError;
    }

    if (!teacherId) {
      return NextResponse.json({ message: "Teacher already exists, skipping seed." });
    }

    // Create demo story
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .insert({
        title: "Kelinci yang Rajin",
        description:
          "Cerita tentang Kelinci yang selalu rajin dan suka membantu teman-temannya. Cocok untuk siswa kelas 1-2 SD.",
        theme: "moral",
        level: "dasar",
        target_class: "Kelas 1-2",
        status: "published",
        author_id: teacherId,
      })
      .select()
      .single();

    if (storyError) throw storyError;

    // Create panels
    const panelsData = [
      {
        story_id: story.id,
        order_index: 0,
        background_color: "#fef3c7",
        narration_text:
          "Pagi hari yang cerah. Matahari bersinar dengan hangat. Kelinci bangun dari tidurnya dengan penuh semangat.",
      },
      {
        story_id: story.id,
        order_index: 1,
        background_color: "#dbeafe",
        narration_text:
          "Kelinci selalu merapikan tempat tidurnya sendiri setiap pagi. Ibu Kelinci sangat bangga melihatnya.",
      },
      {
        story_id: story.id,
        order_index: 2,
        background_color: "#d1fae5",
        narration_text:
          "Di jalan menuju sekolah, Kelinci bertemu sahabatnya, Kura-kura. Mereka selalu berangkat bersama.",
      },
      {
        story_id: story.id,
        order_index: 3,
        background_color: "#fef3c7",
        narration_text:
          "Di kelas, Kelinci selalu aktif menjawab pertanyaan Bu Guru. Teman-teman kagum dengan semangatnya.",
      },
      {
        story_id: story.id,
        order_index: 4,
        background_color: "#fce7f3",
        narration_text:
          "Sepulang sekolah, Kelinci membantu Kura-kura yang kesulitan membawa buku-buku yang berat.",
      },
      {
        story_id: story.id,
        order_index: 5,
        background_color: "#e0e7ff",
        narration_text:
          'Malamnya, Kelinci membaca buku cerita sebelum tidur. "Membaca itu menyenangkan!" kata Kelinci. Kelinci memang rajin!',
      },
    ];

    const { data: panels, error: panelsError } = await supabase
      .from("panels")
      .insert(panelsData)
      .select();

    if (panelsError) throw panelsError;

    // Create dialogs for each panel
    const dialogsData = [
      // Panel 1
      {
        panel_id: panels[0].id,
        order_index: 0,
        character_name: "Kelinci",
        character_color: "#f59e0b",
        text: "Selamat pagi, Matahari! Hari ini aku akan rajin lagi!",
        bubble_style: "kotak",
        position_x: 60,
        position_y: 25,
      },
      // Panel 2
      {
        panel_id: panels[1].id,
        order_index: 0,
        character_name: "Ibu Kelinci",
        character_color: "#ec4899",
        text: "Wah, rajin sekali kamu, Nak! Ibu bangga!",
        bubble_style: "oval",
        position_x: 30,
        position_y: 20,
      },
      {
        panel_id: panels[1].id,
        order_index: 1,
        character_name: "Kelinci",
        character_color: "#f59e0b",
        text: "Terima kasih, Bu! Merapikan tempat tidur itu mudah, kok!",
        bubble_style: "kotak",
        position_x: 70,
        position_y: 50,
      },
      // Panel 3
      {
        panel_id: panels[2].id,
        order_index: 0,
        character_name: "Kelinci",
        character_color: "#f59e0b",
        text: "Hai, Kura-kura! Ayo kita ke sekolah bersama!",
        bubble_style: "kotak",
        position_x: 35,
        position_y: 20,
      },
      {
        panel_id: panels[2].id,
        order_index: 1,
        character_name: "Kura-kura",
        character_color: "#10b981",
        text: "Ayo, Kelinci! Aku sudah siap! Tunggu aku, ya!",
        bubble_style: "oval",
        position_x: 70,
        position_y: 45,
      },
      // Panel 4
      {
        panel_id: panels[3].id,
        order_index: 0,
        character_name: "Kelinci",
        character_color: "#f59e0b",
        text: "Saya tahu jawabannya, Bu Guru!",
        bubble_style: "ledakan",
        position_x: 55,
        position_y: 20,
      },
      // Panel 5
      {
        panel_id: panels[4].id,
        order_index: 0,
        character_name: "Kura-kura",
        character_color: "#10b981",
        text: "Aduh, buku-buku ini berat sekali...",
        bubble_style: "awan",
        position_x: 30,
        position_y: 20,
      },
      {
        panel_id: panels[4].id,
        order_index: 1,
        character_name: "Kelinci",
        character_color: "#f59e0b",
        text: "Sini, biar aku bantu! Teman harus saling membantu!",
        bubble_style: "kotak",
        position_x: 70,
        position_y: 45,
      },
      {
        panel_id: panels[4].id,
        order_index: 2,
        character_name: "Kura-kura",
        character_color: "#10b981",
        text: "Terima kasih banyak, Kelinci! Kamu memang sahabat terbaik!",
        bubble_style: "oval",
        position_x: 35,
        position_y: 70,
      },
      // Panel 6
      {
        panel_id: panels[5].id,
        order_index: 0,
        character_name: "Kelinci",
        character_color: "#f59e0b",
        text: "Membaca itu menyenangkan! Buku ini seru sekali!",
        bubble_style: "kotak",
        position_x: 55,
        position_y: 25,
      },
    ];

    const { error: dialogsError } = await supabase
      .from("dialogs")
      .insert(dialogsData);

    if (dialogsError) throw dialogsError;

    // Create a second story
    const { data: story2 } = await supabase
      .from("stories")
      .insert({
        title: "Petualangan di Taman Sekolah",
        description:
          "Dina dan teman-temannya menemukan taman rahasia di belakang sekolah. Apa yang akan mereka temukan?",
        theme: "petualangan",
        level: "menengah",
        target_class: "Kelas 3-4",
        status: "published",
        author_id: teacherId,
      })
      .select()
      .single();

    if (story2) {
      const s2Panels = [
        {
          story_id: story2.id,
          order_index: 0,
          background_color: "#dcfce7",
          narration_text:
            "Suatu hari, saat istirahat, Dina melihat seekor kupu-kupu cantik terbang melewati pagar belakang sekolah.",
        },
        {
          story_id: story2.id,
          order_index: 1,
          background_color: "#fef9c3",
          narration_text:
            'Dina mengajak sahabatnya, Riko, untuk mengikuti kupu-kupu itu. "Ayo kita lihat ke mana dia pergi!" kata Dina.',
        },
        {
          story_id: story2.id,
          order_index: 2,
          background_color: "#e0f2fe",
          narration_text:
            "Di balik pagar, mereka menemukan taman kecil yang indah. Ada bunga-bunga berwarna-warni dan sebuah kolam kecil dengan ikan-ikan.",
        },
      ];

      const { data: s2PanelsRes } = await supabase
        .from("panels")
        .insert(s2Panels)
        .select();

      if (s2PanelsRes) {
        await supabase.from("dialogs").insert([
          {
            panel_id: s2PanelsRes[0].id,
            order_index: 0,
            character_name: "Dina",
            character_color: "#8b5cf6",
            text: "Wah, lihat kupu-kupu itu! Cantik sekali!",
            bubble_style: "kotak",
            position_x: 40,
            position_y: 25,
          },
          {
            panel_id: s2PanelsRes[1].id,
            order_index: 0,
            character_name: "Dina",
            character_color: "#8b5cf6",
            text: "Riko, ayo kita ikuti kupu-kupu itu!",
            bubble_style: "kotak",
            position_x: 35,
            position_y: 20,
          },
          {
            panel_id: s2PanelsRes[1].id,
            order_index: 1,
            character_name: "Riko",
            character_color: "#0ea5e9",
            text: "Baiklah! Tapi kita harus hati-hati, ya!",
            bubble_style: "oval",
            position_x: 65,
            position_y: 50,
          },
          {
            panel_id: s2PanelsRes[2].id,
            order_index: 0,
            character_name: "Dina",
            character_color: "#8b5cf6",
            text: "Lihat, Riko! Ada taman rahasia di sini! Indah sekali!",
            bubble_style: "ledakan",
            position_x: 50,
            position_y: 20,
          },
          {
            panel_id: s2PanelsRes[2].id,
            order_index: 1,
            character_name: "Riko",
            character_color: "#0ea5e9",
            text: "Luar biasa! Kita harus ceritakan ini ke teman-teman!",
            bubble_style: "kotak",
            position_x: 55,
            position_y: 55,
          },
        ]);
      }
    }

    // Create classroom
    await supabase.from("classrooms").insert({
      name: "Kelas 2A - Demo",
      code: "DEMO2A",
      teacher_id: teacherId,
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
