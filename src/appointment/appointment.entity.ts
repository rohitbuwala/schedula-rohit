  import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { DoctorProfile } from '../doctor/doctor-profile.entity';
  import { SchedulingType } from '../doctor/scheduling-type.enum';
  import { PatientProfile } from '../patient/patient-profile.entity';
  import { AppointmentStatus } from './appointment-status.enum';

  @Entity({ name: 'appointments' })
  @Index('IDX_appointments_booked_patient_slot', [
    'doctor',
    'patient',
    'date',
    'schedulingType',
    'source',
    'startTime',
    'endTime',
  ], {
    unique: true,
    where: `"status" = 'BOOKED'`,
  })
  @Index('IDX_appointments_booked_wave_token', [
    'doctor',
    'date',
    'schedulingType',
    'source',
    'startTime',
    'endTime',
    'tokenNumber',
  ], {
    unique: true,
    where: `"status" = 'BOOKED' AND "tokenNumber" IS NOT NULL`,
  })
  export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => DoctorProfile, { nullable: false, onDelete: 'CASCADE' })
    doctor: DoctorProfile;

    @ManyToOne(() => PatientProfile, { nullable: false, onDelete: 'CASCADE' })
    patient: PatientProfile;

    @Column({ type: 'date' })
    date: string;

    @Column({
      type: 'enum',
      enum: SchedulingType,
    })
    schedulingType: SchedulingType;

    @Column()
    source: 'CUSTOM' | 'RECURRING';

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;

    @Column({ nullable: true })
    tokenNumber?: number;

    @Column({
      type: 'enum',
      enum: AppointmentStatus,
      default: AppointmentStatus.BOOKED,
    })
    status: AppointmentStatus;

    @CreateDateColumn()
    createdAt: Date;
  }
