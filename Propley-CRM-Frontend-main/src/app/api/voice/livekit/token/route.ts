import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

interface AdvisorClaims {
  id: string;
  email: string;
}

function readBearer(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

function verifyAdvisor(token: string): AdvisorClaims | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret) as Partial<AdvisorClaims>;
    if (!decoded?.id || !decoded?.email) return null;
    return { id: String(decoded.id), email: String(decoded.email) };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !url) {
      return NextResponse.json(
        { error: 'LiveKit is not configured.' },
        { status: 503 }
      );
    }
    if (!process.env.JWT_SECRET) {
      console.error('[voice/livekit/token] JWT_SECRET is not set — refusing to mint tokens');
      return NextResponse.json({ error: 'Voice is not configured.' }, { status: 503 });
    }

    const bearer = readBearer(request);
    if (!bearer) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const advisor = verifyAdvisor(bearer);
    if (!advisor) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const identity = advisor.id;

    const session = randomUUID().slice(0, 8);
    const roomName = `propley-voice-${identity}-${session}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: advisor.email,
      ttl: '1h',
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token, url, roomName, identity });
  } catch (err) {
    console.error('[voice/livekit/token] failed', err);
    return NextResponse.json({ error: 'Could not start a voice session.' }, { status: 500 });
  }
}
