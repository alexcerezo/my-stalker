import { Client } from '@microsoft/microsoft-graph-client';

/**
 * Interface for DriveItem representing a file or folder in OneDrive
 */
export interface DriveItem {
  id: string;
  name: string;
  '@microsoft.graph.downloadUrl'?: string;
  folder?: { childCount: number };
  file?: {
    mimeType: string;
  };
  image?: {
    width: number;
    height: number;
  };
  photo?: {
    takenDateTime?: string;
  };
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

interface SearchResponse {
  value: DriveItem[];
}

interface ListResponse {
  value: DriveItem[];
  '@odata.nextLink'?: string;
}

/**
 * Creates an authenticated Microsoft Graph client
 * @param accessToken - The access token obtained from MSAL
 * @returns Configured Graph client
 */
export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Searches for a folder by name in the user's OneDrive
 * @param accessToken - The access token for authentication
 * @param folderName - The name of the folder to search for
 * @returns The DriveItem of the found folder, or null if not found
 */
export async function searchFolderByName(
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
 * Lista todas las imágenes de una carpeta (con paginación)
 * @param accessToken - The access token for authentication
 * @param folderId - The ID of the folder to list images from
 * @returns Array of DriveItems representing image files
 */
export async function listImagesFromFolder(
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
 * Fetches photos from a specific folder by name
 * @param accessToken - The access token for authentication
 * @param folderName - The name of the folder containing photos
 * @returns Array of DriveItems representing the photos
 */
export async function getPhotosFromFolder(
  accessToken: string,
  folderName: string
): Promise<DriveItem[]> {
  try {
    const folder = await searchFolderByName(accessToken, folderName);

    if (!folder) {
      console.warn(`Folder "${folderName}" not found`);
      return [];
    }

    const images = await listImagesFromFolder(accessToken, folder.id);

    return images;
  } catch (error) {
    console.error('Error getting photos from folder:', error);
    throw error;
  }
}
