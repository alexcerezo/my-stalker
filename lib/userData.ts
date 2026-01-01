import { SuggestedUser } from '@/components/SuggestedUsers';
import { getImageUrl } from './imageUtils';
import userDataJson from '@/data/user-data.json';

export interface CurrentUser {
  username: string;
  fullName: string;
  avatar: string;
}

export interface UserData {
  currentUser: CurrentUser;
  suggestedUsers: SuggestedUser[];
}

/**
 * Obtiene los datos del usuario actual desde el archivo JSON
 * Edita /data/user-data.json para cambiar la información del usuario
 */
export function getCurrentUser(): CurrentUser {
  return {
    ...userDataJson.currentUser,
    avatar: getImageUrl(userDataJson.currentUser.avatar),
  };
}

/**
 * Obtiene la lista de usuarios sugeridos desde el archivo JSON
 * Edita /data/user-data.json para cambiar los usuarios sugeridos
 */
export function getSuggestedUsers(): SuggestedUser[] {
  return userDataJson.suggestedUsers.map((user: SuggestedUser) => ({
    ...user,
    avatar: getImageUrl(user.avatar),
  }));
}
