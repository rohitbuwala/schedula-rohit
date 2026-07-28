import 'dotenv/config';
import { DataSource } from 'typeorm';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { CustomAvailability } from '../doctor/entity/custom-availability.entity';
import { RecurringAvailability } from '../doctor/entity/recurring-availability.entity';
import { PatientProfile } from '../patient/patient-profile.entity';
import { WaveBooking } from '../patient/wave-booking.entity';
import { User } from '../users/user.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    DoctorProfile,
    PatientProfile,
    WaveBooking,
    RecurringAvailability,
    CustomAvailability,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
