import { NextResponse } from 'next/server';
import { DriveItem } from '@/lib/graphService';
import { getImageUrl } from '@/lib/imageUtils';
import userDataJson from '@/data/user-data.json';

// Forzar comportamiento dinámico y deshabilitar caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface SearchResponse {
  value: DriveItem[];
}

interface ListResponse {
  value: DriveItem[];
  '@odata.nextLink'?: string;
}

interface Post {
  id: string;
  username: string;
  userAvatar: string;
  images: string[];
  likes: number;
  likedBy: string;
  description: string;
  timeAgo: string;
}

/**
 * Extrae la fecha del nombre del archivo si sigue el formato YYYYMMDD
 */
function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}T12:00:00Z`;
  }
  return null;
}

/**
 * Obtiene el tiempo relativo (ej: "30 minutes ago", "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
}

/**
 * Agrupa fotos por día de creación y orientación (horizontal/vertical)
 */
function groupPhotosByDay(photos: DriveItem[]): Post[] {
  const groups = new Map<string, DriveItem[]>();

  photos.forEach((photo) => {
    const filenameDate = extractDateFromFilename(photo.name);
    const dateStr = filenameDate || photo.photo?.takenDateTime || photo.createdDateTime || photo.lastModifiedDateTime;
    if (!dateStr) return;

    const date = new Date(dateStr);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const isHorizontal = (photo.image?.width ?? 0) >= (photo.image?.height ?? 0);
    const orientation = isHorizontal ? 'h' : 'v';
    const groupKey = `${dayKey}-${orientation}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(photo);
  });

  return Array.from(groups.entries())
    .map(([key, photos]) => {
      const firstPhoto = photos[0];
      const filenameDate = extractDateFromFilename(firstPhoto.name);
      const dateStr = filenameDate || firstPhoto.photo?.takenDateTime || firstPhoto.createdDateTime || firstPhoto.lastModifiedDateTime!;
      const date = new Date(dateStr);
      
      return {
        id: key,
        username: userDataJson.currentUser.username,
        userAvatar: getImageUrl(userDataJson.currentUser.avatar),
        images: photos.map(p => `/api/image?id=${p.id}`),
        likes: Math.floor(Math.random() * 200) + 10,
        likedBy: userDataJson.suggestedUsers[0]?.username || 'unknown',
        description: `Fotitos del ${date.toLocaleDateString()}`,
        timeAgo: getRelativeTime(date),
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.id.split('-').slice(0, 3).join('-'));
      const dateB = new Date(b.id.split('-').slice(0, 3).join('-'));
      return dateB.getTime() - dateA.getTime();
    });
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
    const error = await response.text();
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh access token');
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

/**
 * Busca una carpeta por nombre en OneDrive
 */
async function searchFolderByName(
  accessToken: string,
  folderName: string
): Promise<DriveItem | null> {
  const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(folderName)}')`;

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to search for folder');
  }

  const data: SearchResponse = await response.json();
  const folder = data.value.find(
    (item: DriveItem) => item.name === folderName && item.folder
  );

  return folder || null;
}

/**
 * Lista todas las imágenes de una carpeta (con paginación)
 */
async function listImagesFromFolder(
  accessToken: string,
  folderId: string
): Promise<DriveItem[]> {
  let allItems: DriveItem[] = [];
  let nextLink: string | null = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=200&$select=id,name,createdDateTime,lastModifiedDateTime,file,photo,image`;

  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list images from folder');
    }

    const data: ListResponse = await response.json();
    allItems = allItems.concat(data.value);
    nextLink = data['@odata.nextLink'] || null;
  }
  
  const images = allItems.filter(
    (item: DriveItem) =>
      item.file &&
      item.file.mimeType &&
      item.file.mimeType.startsWith('image/') &&
      !item.file.mimeType.includes('heic') &&
      !item.file.mimeType.includes('heif') &&
      !item.name.toLowerCase().endsWith('.heic') &&
      !item.name.toLowerCase().endsWith('.heif')
  );

  images.sort((a, b) => {
    const dateStrA = extractDateFromFilename(a.name) || a.photo?.takenDateTime || a.createdDateTime;
    const dateStrB = extractDateFromFilename(b.name) || b.photo?.takenDateTime || b.createdDateTime;
    const dateA = new Date(dateStrA || 0).getTime();
    const dateB = new Date(dateStrB || 0).getTime();
    return dateB - dateA;
  });

  return images;
}

/**
 * API Route Handler - Obtiene fotos de OneDrive sin autenticación de usuario
 */
export async function GET() {
  try {
    const folderName = process.env.NEXT_PUBLIC_ONEDRIVE_FOLDER_NAME;

    if (!folderName) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_ONEDRIVE_FOLDER_NAME not configured' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessTokenFromRefreshToken();
    const folder = await searchFolderByName(accessToken, folderName);

    if (!folder) {
      return NextResponse.json(
        { error: `Folder "${folderName}" not found` },
        { status: 404 }
      );
    }

    const photos = await listImagesFromFolder(accessToken, folder.id);
    const posts = groupPhotosByDay(photos);

    return NextResponse.json({ posts, totalPhotos: photos.length });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
