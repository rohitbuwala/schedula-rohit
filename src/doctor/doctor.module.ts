import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from '../appointment/appointment.module';
import { DoctorController } from './doctor.controller';
import { DoctorProfile } from './doctor-profile.entity';
import { DoctorService } from './doctor.service';
import { CustomAvailability } from './entity/custom-availability.entity';
import { RecurringAvailability } from './entity/recurring-availability.entity';

@Module({
  imports: [
    AppointmentModule,
    TypeOrmModule.forFeature([
      DoctorProfile,
      RecurringAvailability,
      CustomAvailability,
    ]),
  ],
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}
