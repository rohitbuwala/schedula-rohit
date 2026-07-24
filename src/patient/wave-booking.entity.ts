import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { PatientProfile } from './patient-profile.entity';

@Entity({ name: 'wave_bookings' })
@Unique('UQ_wave_bookings_patient_per_wave', [
  'doctor',
  'patient',
  'date',
  'source',
  'waveStartTime',
  'waveEndTime',
])
@Unique('UQ_wave_bookings_token_per_wave', [
  'doctor',
  'date',
  'source',
  'waveStartTime',
  'waveEndTime',
  'tokenNumber',
])
export class WaveBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DoctorProfile, { nullable: false, onDelete: 'CASCADE' })
  doctor: DoctorProfile;

  @ManyToOne(() => PatientProfile, { nullable: false, onDelete: 'CASCADE' })
  patient: PatientProfile;

  @Column({ type: 'date' })
  date: string;

  @Column()
  source: 'CUSTOM' | 'RECURRING';

  @Column({ type: 'time' })
  waveStartTime: string;

  @Column({ type: 'time' })
  waveEndTime: string;

  @Column()
  tokenNumber: number;

  @CreateDateColumn()
  createdAt: Date;
}
