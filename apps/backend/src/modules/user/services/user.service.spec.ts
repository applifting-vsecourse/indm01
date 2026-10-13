import { UserProfile } from '@/modules/user/domain/user-profile';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { UserService } from './user.service';

const aProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u1',
  email: 'duck@pond.com',
  name: 'Caffeinated Duck',
  username: 'CaffeinatedDuck',
  bio: 'Living on the pond',
  defaultMood: null,
  ...overrides,
});

describe('UserService', () => {
  it('returns settings for the signed-in user', async () => {
    const profile = aProfile();
    const repository = mock<UserRepository>();
    repository.findById.mockResolvedValue(profile);

    const service = new UserService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.getSettings(user)).resolves.toEqual(profile);
    expect(repository.findById).toHaveBeenCalledWith('u1');
  });

  it('throws NotFoundException if user is not found', async () => {
    const repository = mock<UserRepository>();
    repository.findById.mockResolvedValue(null);

    const service = new UserService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.getSettings(user)).rejects.toThrow(NotFoundException);
  });

  describe('updateSettings', () => {
    it('updates user settings successfully', async () => {
      const updated = aProfile({
        name: 'Super Duck',
        username: 'super_duck',
        bio: 'Just floating around',
        defaultMood: 'happy',
      });
      const repository = mock<UserRepository>();
      repository.findByUsername.mockResolvedValue(null);
      repository.update.mockResolvedValue(updated);

      const service = new UserService(repository);
      const user = { id: 'u1' } as Identity;

      await expect(
        service.updateSettings(user, {
          name: 'Super Duck',
          username: 'super_duck',
          bio: 'Just floating around',
          defaultMood: 'happy',
        }),
      ).resolves.toEqual(updated);

      expect(repository.update).toHaveBeenCalledWith('u1', {
        name: 'Super Duck',
        username: 'super_duck',
        bio: 'Just floating around',
        defaultMood: 'happy',
      });
    });

    it('allows keeping current username', async () => {
      const profile = aProfile();
      const repository = mock<UserRepository>();
      // Same user already owns this username
      repository.findByUsername.mockResolvedValue(profile);
      repository.update.mockResolvedValue(profile);

      const service = new UserService(repository);
      const user = { id: 'u1' } as Identity;

      await expect(
        service.updateSettings(user, {
          name: 'Caffeinated Duck',
          username: 'CaffeinatedDuck',
          bio: 'Living on the pond',
          defaultMood: null,
        }),
      ).resolves.toEqual(profile);

      expect(repository.update).toHaveBeenCalledWith('u1', {
        name: 'Caffeinated Duck',
        username: 'CaffeinatedDuck',
        bio: 'Living on the pond',
        defaultMood: null,
      });
    });

    it('rejects if username is already taken by another user', async () => {
      const otherUser = aProfile({ id: 'u2', username: 'other_duck' });
      const repository = mock<UserRepository>();
      repository.findByUsername.mockResolvedValue(otherUser);

      const service = new UserService(repository);
      const user = { id: 'u1' } as Identity;

      await expect(
        service.updateSettings(user, {
          name: 'Caffeinated Duck',
          username: 'other_duck',
        }),
      ).rejects.toThrow(ConflictException);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('clears bio when empty or whitespace', async () => {
      const updated = aProfile({ bio: null });
      const repository = mock<UserRepository>();
      repository.findByUsername.mockResolvedValue(null);
      repository.update.mockResolvedValue(updated);

      const service = new UserService(repository);
      const user = { id: 'u1' } as Identity;

      await service.updateSettings(user, {
        name: 'Caffeinated Duck',
        username: 'CaffeinatedDuck',
        bio: '   ',
      });

      expect(repository.update).toHaveBeenCalledWith('u1', {
        name: 'Caffeinated Duck',
        username: 'CaffeinatedDuck',
        bio: null,
        defaultMood: null,
      });
    });
  });
});
