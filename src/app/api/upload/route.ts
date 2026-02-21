import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

const MATERIALS_BUCKET = "learning materials";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const fileValue = formData.get("file");
    const titleValue = formData.get("title");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const file = fileValue;
    const userId = user.id;
    const title =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : file.name;

    //create document row
    const { data: document, error: insertError } = await supabaseAdmin
      .from("documents")
      .insert({
        user_id: userId,
        title,
        file_type: file.type,
        file_path: "",
        status: "uploaded",
      })
      .select()
      .single();

    if (insertError || !document) {
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    const fileExt = file.name.split(".").pop() || "pdf";
    const storagePath = `${userId}/${document.id}/original.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // update file path in documents table
    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({ file_path: storagePath, status: "uploaded" })
      .eq("id", document.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update file path" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
