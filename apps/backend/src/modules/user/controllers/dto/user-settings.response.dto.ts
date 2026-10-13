import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { UserProfile } from '@/modules/user/domain/user-profile';
import { ApiProperty } from '@nestjs/swagger';

export class UserSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  defaultMood!: QuackMood | null;

  static fromDomain(profile: UserProfile): UserSettingsResponseDto {
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      defaultMood: profile.defaultMood,
    };
  }
}
