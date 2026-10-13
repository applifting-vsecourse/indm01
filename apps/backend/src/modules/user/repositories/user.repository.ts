import { PrismaService } from '@/core/prisma/prisma.service';
import { User as PrismaUser } from '@/generated/prisma/client';
import { QuackMood } from '@/modules/quack/domain/quack';
import { UserProfile } from '@/modules/user/domain/user-profile';
import { Injectable } from '@nestjs/common';

const mapPrismaUserToProfile = (user: PrismaUser): UserProfile => ({
  id: user.id,
  email: user.email,
  name: user.name,
  username: user.username ?? '',
  bio: user.bio,
  defaultMood: user.defaultMood as QuackMood | null,
});

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? mapPrismaUserToProfile(user) : null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });
    return user ? mapPrismaUserToProfile(user) : null;
  }

  async update(
    id: string,
    data: {
      name: string;
      username: string;
      bio: string | null;
      defaultMood: QuackMood | null;
    },
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        displayUsername: data.username,
        bio: data.bio,
        defaultMood: data.defaultMood,
      },
    });
    return mapPrismaUserToProfile(user);
  }
}
