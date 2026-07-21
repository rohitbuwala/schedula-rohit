import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  @Get('profile')
  @Roles(UserRole.PATIENT)
  getProfile() {
    return {
      role: UserRole.PATIENT,
      message: 'Patient profile data',
      profile: {
        name: 'Sample Patient',
        upcomingAppointments: [],
      },
    };
  }
}
