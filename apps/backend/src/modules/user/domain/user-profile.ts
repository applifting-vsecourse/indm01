import { QuackMood } from '@/modules/quack/domain/quack';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  username: string;
  bio: string | null;
  defaultMood: QuackMood | null;
};

export type UpdateUserProfileData = {
  name: string;
  username: string;
  bio?: string | null;
  defaultMood?: QuackMood | null;
};
