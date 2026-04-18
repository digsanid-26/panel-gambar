import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/students/create
 * Creates a Supabase auth account for a managed student.
 * Only callable by a logged-in guru/admin.
 *
 * Body: { name, username, email?, password, class_id }
 * Returns: { managed_student_id, user_id, profile_id }
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration missing (SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );
  }

  // Verify the caller is a logged-in guru/admin
  const serverClient = await createServerSupabaseClient();
  const {
    data: { user: caller },
  } = await serverClient.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await serverClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || (callerProfile.role !== "guru" && callerProfile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden: only guru/admin can create students" }, { status: 403 });
  }

  // Parse body
  const body = await request.json();
  const { name, username, email, password, class_id } = body as {
    name: string;
    username: string;
    email?: string;
    password: string;
    class_id: string;
  };

  if (!name || !username || !password || !class_id) {
    return NextResponse.json(
      { error: "Missing required fields: name, username, password, class_id" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password minimal 6 karakter" },
      { status: 400 }
    );
  }

  // Use admin client with service role to create auth user
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Generate a unique email for the student if not provided
  // Supabase requires email for auth, so we create a synthetic one
  const studentEmail = email && email.trim()
    ? email.trim()
    : `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}+${Date.now()}@student.local`;

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { name, role: "siswa", username },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Upsert profile (trigger may already create it, but ensure fields are correct)
    await adminClient.from("profiles").upsert({
      id: userId,
      name,
      role: "siswa",
      school: "",
    }, { onConflict: "id" });

    // 3. Create managed_students entry linked to the auth user
    const { data: msData, error: msError } = await adminClient
      .from("managed_students")
      .insert({
        name,
        username,
        email: email && email.trim() ? email.trim() : null,
        class_id,
        teacher_id: caller.id,
        user_id: userId,
      })
      .select()
      .single();

    if (msError) {
      // If managed_students insert fails (e.g. unique constraint), clean up the auth user
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: msError.message }, { status: 400 });
    }

    // 4. Add student to classroom_members
    await adminClient.from("classroom_members").upsert({
      classroom_id: class_id,
      student_id: userId,
    }, { onConflict: "classroom_id,student_id" }).select();

    return NextResponse.json({
      managed_student_id: msData.id,
      user_id: userId,
      profile_id: userId,
      message: `Akun siswa "${name}" berhasil dibuat`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
