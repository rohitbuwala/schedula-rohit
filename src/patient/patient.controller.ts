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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import {
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from './dto/patient-profile.dto';
import { PatientService } from './patient.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('profile')
  @Roles(UserRole.PATIENT)
  createProfile(
    @Req() request: AuthenticatedRequest,
    @Body() createPatientProfileDto: CreatePatientProfileDto,
  ) {
    return this.patientService.createProfile(
      request.user,
      createPatientProfileDto,
    );
  }

  @Get('profile')
  @Roles(UserRole.PATIENT)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.patientService.getProfile(request.user.id);
  }

  @Patch('profile')
  @Roles(UserRole.PATIENT)
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() updatePatientProfileDto: UpdatePatientProfileDto,
  ) {
    return this.patientService.updateProfile(
      request.user.id,
      updatePatientProfileDto,
    );
  }
}
