import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { DoctorService } from './doctor.service';
import {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
} from './dto/doctor-profile.dto';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('profile')
  @Roles(UserRole.DOCTOR)
  createProfile(
    @Req() request: AuthenticatedRequest,
    @Body() createDoctorProfileDto: CreateDoctorProfileDto,
  ) {
    return this.doctorService.createProfile(
      request.user,
      createDoctorProfileDto,
    );
  }

  @Get('profile')
  @Roles(UserRole.DOCTOR)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.doctorService.getProfile(request.user.id);
  }

  @Patch('profile')
  @Roles(UserRole.DOCTOR)
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() updateDoctorProfileDto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.updateProfile(
      request.user.id,
      updateDoctorProfileDto,
    );
  }
}
