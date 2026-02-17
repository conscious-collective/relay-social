import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${API_URL}/api/${path.join("/")}?${request.nextUrl.searchParams}`;
  
  const token = request.headers.get("authorization");
  
  const response = await fetch(url, {
    headers: {
      ...(token && { Authorization: token }),
    },
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${API_URL}/api/${path.join("/")}`;
  const token = request.headers.get("authorization");
  const body = await request.json();
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: token }),
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${API_URL}/api/${path.join("/")}`;
  const token = request.headers.get("authorization");
  const body = await request.json();
  
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: token }),
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${API_URL}/api/${path.join("/")}`;
  const token = request.headers.get("authorization");
  
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...(token && { Authorization: token }),
    },
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
