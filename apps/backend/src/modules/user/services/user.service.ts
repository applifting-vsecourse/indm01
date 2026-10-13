import {
  UpdateUserProfileData,
  UserProfile,
} from '@/modules/user/domain/user-profile';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getSettings(user: Identity): Promise<UserProfile> {
    const profile = await this.userRepository.findById(user.id);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  async updateSettings(
    user: Identity,
    data: UpdateUserProfileData,
  ): Promise<UserProfile> {
    const trimmedUsername = data.username.trim();
    const existing = await this.userRepository.findByUsername(trimmedUsername);
    if (existing && existing.id !== user.id) {
      throw new ConflictException('This username is already taken');
    }

    const bio =
      data.bio !== undefined
        ? data.bio && data.bio.trim().length > 0
          ? data.bio.trim()
          : null
        : null;

    return this.userRepository.update(user.id, {
      name: data.name.trim(),
      username: trimmedUsername,
      bio,
      defaultMood: data.defaultMood ?? null,
    });
  }
}
