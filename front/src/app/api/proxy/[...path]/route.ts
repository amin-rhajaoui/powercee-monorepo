import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const path = pathSegments.join("/");
  const url = `${API_URL}/${path}${request.nextUrl.search}`;

  // Récupérer tous les cookies
  const cookieHeader = request.headers.get("cookie") || "";

  // Préparer les headers
  const headers: HeadersInit = {
    ...(cookieHeader && { Cookie: cookieHeader }),
  };

  // Préparer le body
  let body: BodyInit | undefined;
  const contentType = request.headers.get("content-type");

  if (method !== "GET" && method !== "DELETE") {
    if (contentType?.includes("multipart/form-data")) {
      // Pour FormData, utiliser formData() directement
      body = await request.formData();
    } else {
      // Pour JSON ou autres
      body = await request.text();
      if (contentType) {
        headers["Content-Type"] = contentType;
      }
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    // Lire le body de la réponse
    const responseBody = await response.text();

    // Créer les headers de réponse
    const responseHeaders = new Headers();

    // Transmettre tous les headers sauf ceux gérés par Next.js
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "content-encoding" &&
        lowerKey !== "content-length" &&
        lowerKey !== "transfer-encoding" &&
        lowerKey !== "connection"
      ) {
        if (lowerKey === "set-cookie") {
          // Transmettre chaque Set-Cookie individuellement
          response.headers.getSetCookie().forEach((cookie) => {
            responseHeaders.append("Set-Cookie", cookie);
          });
        } else {
          responseHeaders.set(key, value);
        }
      }
    });

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "Erreur lors de la communication avec le serveur" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "DELETE");
}

