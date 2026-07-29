import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { CustomAvailability } from '../doctor/entity/custom-availability.entity';
import { RecurringAvailability } from '../doctor/entity/recurring-availability.entity';
import { PatientProfile } from '../patient/patient-profile.entity';
import { AppointmentController } from './appointment.controller';
import { Appointment } from './appointment.entity';
import { AppointmentService } from './appointment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      DoctorProfile,
      PatientProfile,
      RecurringAvailability,
      CustomAvailability,
    ]),
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
})
export class AppointmentModule {}
