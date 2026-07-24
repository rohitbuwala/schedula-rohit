import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientProfile } from './patient-profile.entity';
import { PatientService } from './patient.service';

@Module({
  imports: [TypeOrmModule.forFeature([PatientProfile])],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
