import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
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
import { CreateCustomAvailabilityDto } from './dto/custom-availability.dto';
import {
  CreateRecurringAvailabilityDto,
  UpdateRecurringAvailabilityDto,
} from './dto/recurring-availability.dto';

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

  @Post('availability')
  @Roles(UserRole.DOCTOR)
  createAvailability(
    @Req() request: AuthenticatedRequest,
    @Body() createRecurringAvailabilityDto: CreateRecurringAvailabilityDto,
  ) {
    return this.doctorService.createAvailability(
      request.user.id,
      createRecurringAvailabilityDto,
    );
  }

  @Get('availability')
  @Roles(UserRole.DOCTOR)
  getAvailability(@Req() request: AuthenticatedRequest) {
    return this.doctorService.getAvailability(request.user.id);
  }

  @Post('availability/override')
  @Roles(UserRole.DOCTOR)
  createAvailabilityOverride(
    @Req() request: AuthenticatedRequest,
    @Body() createCustomAvailabilityDto: CreateCustomAvailabilityDto,
  ) {
    return this.doctorService.createAvailabilityOverride(
      request.user.id,
      createCustomAvailabilityDto,
    );
  }

  @Get('availability/date')
  @Roles(UserRole.DOCTOR)
  getAvailabilityForDate(
    @Req() request: AuthenticatedRequest,
    @Query('date') date: string,
  ) {
    return this.doctorService.getAvailabilityForDate(request.user.id, date);
  }

  @Patch('availability/:id')
  @Roles(UserRole.DOCTOR)
  updateAvailability(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRecurringAvailabilityDto: UpdateRecurringAvailabilityDto,
  ) {
    return this.doctorService.updateAvailability(
      request.user.id,
      id,
      updateRecurringAvailabilityDto,
    );
  }

  @Delete('availability/:id')
  @HttpCode(204)
  @Roles(UserRole.DOCTOR)
  deleteAvailability(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.doctorService.deleteAvailability(request.user.id, id);
  }
}
