import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const s3Path = searchParams.get("path");

  if (!s3Path) {
    return NextResponse.json({ detail: "Paramètre 'path' manquant" }, { status: 400 });
  }

  // Récupérer les cookies de la requête
  const cookieHeader = request.headers.get("cookie") || "";

  // Appeler le backend via le proxy interne
  const backendUrl = `${API_URL}/upload/proxy?path=${encodeURIComponent(s3Path)}`;

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: "Erreur lors de la récupération de l'image" },
        { status: response.status }
      );
    }

    // Récupérer le contenu de l'image
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    // Retourner l'image avec les bons headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { detail: "Erreur lors de la récupération de l'image" },
      { status: 500 }
    );
  }
}

