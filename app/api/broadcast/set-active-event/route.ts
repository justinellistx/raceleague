import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Token can come from header OR body (we accept both)
    const headerToken =
      req.headers.get("x-broadcast-admin-token") ||
      req.headers.get("authorization")?.replace("Bearer ", "");
    const bodyToken = body?.token;

    const token = headerToken || bodyToken;

    const expectedToken = process.env.BROADCAST_ADMIN_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Server missing BROADCAST_ADMIN_TOKEN in .env.local" },
        { status: 500 }
      );
    }

    if (!token || token !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Invalid admin token" },
        { status: 401 }
      );
    }

    // Event id can come in a few common names depending on your UI code
    const active_event_id =
      body?.active_event_id || body?.eventId || body?.event_id;

    if (!active_event_id) {
      return NextResponse.json(
        { ok: false, error: "Missing active_event_id / eventId in request body" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in env",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Find the singleton row (first row)
    const { data: rows, error: selErr } = await supabase
      .from("broadcast_state")
      .select("id")
      .limit(1);

    if (selErr) {
      return NextResponse.json(
        { ok: false, error: "Select broadcast_state failed", details: selErr.message },
        { status: 500 }
      );
    }

    // 2) If no row exists, insert one; otherwise update existing row by id
    if (!rows || rows.length === 0) {
      const { error: insErr } = await supabase
        .from("broadcast_state")
        .insert({ active_event_id });

      if (insErr) {
        return NextResponse.json(
          { ok: false, error: "Insert broadcast_state failed", details: insErr.message },
          { status: 500 }
        );
      }
    } else {
      const id = rows[0].id;

      const { error: updErr } = await supabase
        .from("broadcast_state")
        .update({ active_event_id })
        .eq("id", id);

      if (updErr) {
        return NextResponse.json(
          { ok: false, error: "Update broadcast_state failed", details: updErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, active_event_id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
