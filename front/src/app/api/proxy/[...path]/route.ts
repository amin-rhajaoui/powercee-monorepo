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

  // Récupérer tous les cookies depuis la requête
  // Les cookies HttpOnly sont transmis automatiquement dans les headers HTTP
  const cookieHeader = request.headers.get("cookie") || "";
  
  // Préparer les headers
  const headers: HeadersInit = {};
  
  // Transmettre les cookies au backend
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  } else {
    // Logger si aucun cookie n'est présent (pour debug)
    if (path.includes("tenants/me") || path.includes("auth")) {
      console.warn(`[Proxy] No cookies found for request to ${path}`);
    }
  }

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

    // Pour les images et autres fichiers binaires, utiliser arrayBuffer
    // Pour les réponses JSON/text, utiliser text()
    const contentType = response.headers.get("content-type") || "";
    const isBinary = contentType.startsWith("image/") || 
                     contentType.startsWith("application/octet-stream") ||
                     contentType.includes("binary");

    if (isBinary) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } else {
      const responseBody = await response.text();
      
      // Si le backend retourne une erreur, logger les détails
      if (!response.ok) {
        console.error(`Backend error [${response.status}]:`, {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          body: responseBody,
        });
      }
      
      return new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }
  } catch (error) {
    console.error("Proxy error:", {
      error: error instanceof Error ? error.message : String(error),
      url,
      method,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        detail: "Erreur lors de la communication avec le serveur",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, "DELETE");
}

