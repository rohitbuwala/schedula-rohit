import 'dotenv/config';
import { DataSource } from 'typeorm';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { PatientProfile } from '../patient/patient-profile.entity';
import { User } from '../users/user.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, DoctorProfile, PatientProfile],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
