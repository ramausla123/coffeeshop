import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;
    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) return null;
    const { password: _pwd, ...result } = user;
    return result;
  }

  async login(user: { username: string; id: number; role: string }) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async authenticate(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const valid = await this.usersService.validatePassword(user, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different');
    }

    await this.usersService.updatePassword(user.id, newPassword);
    return { success: true };
  }
}
