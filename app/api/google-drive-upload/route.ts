import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const uploadUrl = process.env.GOOGLE_DRIVE_UPLOAD_URL || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_UPLOAD_URL || "";
    const uploadToken = process.env.GOOGLE_DRIVE_UPLOAD_TOKEN || "";

    if (!uploadUrl || uploadUrl.includes("COLE_AQUI")) {
      return NextResponse.json(
        { error: "Configure a variavel GOOGLE_DRIVE_UPLOAD_URL no arquivo .env.local e reinicie o sistema." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const foto = formData.get("foto");

    if (!(foto instanceof File)) {
      return NextResponse.json({ error: "Nenhuma foto foi enviada." }, { status: 400 });
    }

    const buffer = Buffer.from(await foto.arrayBuffer());
    const payload = {
      token: uploadToken,
      fileName: foto.name || `foto-${Date.now()}.jpg`,
      mimeType: foto.type || "image/jpeg",
      base64: buffer.toString("base64"),
      diarioId: String(formData.get("diario_id") || ""),
      obraId: String(formData.get("obra_id") || ""),
      descricao: String(formData.get("descricao") || ""),
    };

    const resposta = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const texto = await resposta.text();
    let json: any = {};
    try {
      json = JSON.parse(texto);
    } catch {
      json = { error: texto || "Resposta invalida do Google Apps Script." };
    }

    if (!resposta.ok || json.error) {
      return NextResponse.json(
        { error: json.error || "Erro ao enviar foto para o Google Drive." },
        { status: 500 }
      );
    }

    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao enviar foto para o Google Drive." },
      { status: 500 }
    );
  }
}
