import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Forzar comportamiento dinámico y deshabilitar caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * Obtiene un nuevo access token usando el refresh token
 */
async function getAccessTokenFromRefreshToken(): Promise<string> {
  const clientId = process.env.MSAL_CLIENT_ID;
  const refreshToken = process.env.MSAL_REFRESH_TOKEN;
  const authority = process.env.MSAL_AUTHORITY || 'https://login.microsoftonline.com/common';

  if (!clientId || !refreshToken) {
    throw new Error('Missing MSAL_CLIENT_ID or MSAL_REFRESH_TOKEN in environment variables');
  }

  const tokenEndpoint = `${authority}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'User.Read Files.Read Files.Read.All offline_access',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

/**
 * API Route para servir imágenes de OneDrive como proxy
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const accessToken = await getAccessTokenFromRefreshToken();

    const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${imageId}/content`;
    
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Convertir a WebP con compresión sin reducir resolución
    const optimizedImage = await sharp(Buffer.from(imageBuffer))
      .rotate()  // Auto-rotar según metadatos EXIF (respeta orientación original)
      .webp({ 
        quality: 85,  // Buena calidad con compresión eficiente
        effort: 4     // Balance entre tamaño y velocidad de compresión
      })
      .toBuffer();

    return new NextResponse(new Uint8Array(optimizedImage), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
