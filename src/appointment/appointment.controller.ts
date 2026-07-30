import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post('appointments')
  @Roles(UserRole.PATIENT)
  createAppointment(
    @Req() request: AuthenticatedRequest,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentService.createAppointment(
      request.user.id,
      createAppointmentDto,
    );
  }

  @Get('appointment/my')
  @Roles(UserRole.PATIENT)
  getMyAppointments(@Req() request: AuthenticatedRequest) {
    return this.appointmentService.getMyAppointments(request.user.id);
  }

  @Get('doctor/appointments')
  @Roles(UserRole.DOCTOR)
  getDoctorAppointments(@Req() request: AuthenticatedRequest) {
    return this.appointmentService.getDoctorAppointments(request.user.id);
  }

  @Patch('appointment/:id/cancel')
  @Roles(UserRole.PATIENT, UserRole.DOCTOR)
  cancelAppointment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentService.cancelAppointment(request.user, id);
  }
}
