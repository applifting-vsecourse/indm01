import { UserService } from '@/modules/user/services/user.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UserSettingsResponseDto } from './dto/user-settings.response.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiResponse({ status: 200, type: UserSettingsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async getSettings(@User() user: Identity): Promise<UserSettingsResponseDto> {
    const profile = await this.userService.getSettings(user);
    return UserSettingsResponseDto.fromDomain(profile);
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({ status: 200, type: UserSettingsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  async updateSettings(
    @User() user: Identity,
    @Body() body: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    const profile = await this.userService.updateSettings(user, body);
    return UserSettingsResponseDto.fromDomain(profile);
  }
}
