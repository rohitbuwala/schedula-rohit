import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorController {
  @Get('profile')
  @Roles(UserRole.DOCTOR)
  getProfile() {
    return {
      role: UserRole.DOCTOR,
      message: 'Doctor profile data',
      profile: {
        name: 'Sample Doctor',
        specialization: 'General Medicine',
      },
    };
  }
}
