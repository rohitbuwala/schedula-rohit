import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from '../appointment/appointment.module';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { CustomAvailability } from '../doctor/entity/custom-availability.entity';
import { RecurringAvailability } from '../doctor/entity/recurring-availability.entity';
import { PatientController } from './patient.controller';
import { WaveBooking } from './wave-booking.entity';
import { PatientProfile } from './patient-profile.entity';
import { PatientService } from './patient.service';

@Module({
  imports: [
    AppointmentModule,
    TypeOrmModule.forFeature([
      PatientProfile,
      DoctorProfile,
      RecurringAvailability,
      CustomAvailability,
      WaveBooking,
    ]),
  ],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
