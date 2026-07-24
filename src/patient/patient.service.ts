import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { CustomAvailability } from '../doctor/entity/custom-availability.entity';
import { RecurringAvailability } from '../doctor/entity/recurring-availability.entity';
import { SchedulingType } from '../doctor/scheduling-type.enum';
import { User } from '../users/user.entity';
import { CreateWaveBookingDto } from './dto/create-wave-booking.dto';
import {
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from './dto/patient-profile.dto';
import { PatientProfile } from './patient-profile.entity';
import { WaveBooking } from './wave-booking.entity';

type ResolvedWaveWindow = {
  source: 'CUSTOM' | 'RECURRING';
  startTime: string;
  endTime: string;
};

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(RecurringAvailability)
    private readonly recurringAvailabilityRepository: Repository<RecurringAvailability>,
    @InjectRepository(CustomAvailability)
    private readonly customAvailabilityRepository: Repository<CustomAvailability>,
    @InjectRepository(WaveBooking)
    private readonly waveBookingRepository: Repository<WaveBooking>,
    private readonly dataSource: DataSource,
  ) {}

  async createProfile(user: AuthenticatedUser, dto: CreatePatientProfileDto) {
    const existingProfile = await this.findProfileByUserId(user.id);

    if (existingProfile) {
      throw new ConflictException('Patient profile already exists');
    }

    const profile = this.patientProfileRepository.create({
      ...dto,
      user: { id: user.id } as User,
    });

    return this.patientProfileRepository.save(profile);
  }

  async getProfile(userId: string) {
    const profile = await this.findProfileByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const profile = await this.getProfile(userId);
    Object.assign(profile, dto);

    return this.patientProfileRepository.save(profile);
  }

  async createWaveBooking(userId: string, dto: CreateWaveBookingDto) {
    const patient = await this.getProfile(userId);
    const doctor = await this.doctorProfileRepository.findOne({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (doctor.schedulingType !== SchedulingType.WAVE) {
      throw new BadRequestException(
        'Wave booking is supported only for WAVE scheduling',
      );
    }

    if (
      !Number.isInteger(doctor.maxPatientCapacity) ||
      doctor.maxPatientCapacity <= 0
    ) {
      throw new BadRequestException(
        'Doctor maxPatientCapacity must be an integer greater than 0',
      );
    }

    const date = this.validateDate(dto.date);
    this.validateDateIsNotPast(date);

    const waveWindow = await this.resolveWaveWindow(
      doctor.id,
      date,
      this.normalizeTime(dto.startTime),
      this.normalizeTime(dto.endTime),
    );

    return this.dataSource.transaction(async (entityManager) => {
      await entityManager
        .getRepository(DoctorProfile)
        .createQueryBuilder('doctor')
        .setLock('pessimistic_write')
        .where('doctor.id = :doctorId', { doctorId: doctor.id })
        .getOne();

      const duplicateBooking = await entityManager
        .getRepository(WaveBooking)
        .findOne({
          where: {
            doctor: { id: doctor.id },
            patient: { id: patient.id },
            date,
            source: waveWindow.source,
            waveStartTime: waveWindow.startTime,
            waveEndTime: waveWindow.endTime,
          },
          relations: {
            doctor: true,
            patient: true,
          },
        });

      if (duplicateBooking) {
        throw new ConflictException('Patient has already booked this wave');
      }

      const existingBookingCount = await entityManager
        .getRepository(WaveBooking)
        .count({
          where: {
            doctor: { id: doctor.id },
            date,
            source: waveWindow.source,
            waveStartTime: waveWindow.startTime,
            waveEndTime: waveWindow.endTime,
          },
          relations: {
            doctor: true,
          },
        });

      if (existingBookingCount >= doctor.maxPatientCapacity) {
        throw new ConflictException('Wave is full');
      }

      const latestBooking = await entityManager
        .getRepository(WaveBooking)
        .findOne({
          where: {
            doctor: { id: doctor.id },
            date,
            source: waveWindow.source,
            waveStartTime: waveWindow.startTime,
            waveEndTime: waveWindow.endTime,
          },
          relations: {
            doctor: true,
          },
          order: { tokenNumber: 'DESC' },
        });

      const booking = entityManager.getRepository(WaveBooking).create({
        doctor,
        patient,
        date,
        source: waveWindow.source,
        waveStartTime: waveWindow.startTime,
        waveEndTime: waveWindow.endTime,
        tokenNumber: latestBooking ? latestBooking.tokenNumber + 1 : 1,
      });

      const savedBooking = await entityManager
        .getRepository(WaveBooking)
        .save(booking);

      return {
        id: savedBooking.id,
        doctorId: doctor.id,
        date: savedBooking.date,
        source: savedBooking.source,
        startTime: savedBooking.waveStartTime,
        endTime: savedBooking.waveEndTime,
        tokenNumber: savedBooking.tokenNumber,
      };
    });
  }

  private findProfileByUserId(userId: string) {
    return this.patientProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
  }

  private async resolveWaveWindow(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<ResolvedWaveWindow> {
    const customAvailability = await this.customAvailabilityRepository.find({
      where: { doctor: { id: doctorId }, date },
      order: { startTime: 'ASC' },
    });

    if (customAvailability.length > 0) {
      const matchedCustomWindow = customAvailability.find(
        (availability) =>
          availability.startTime === startTime &&
          availability.endTime === endTime,
      );

      if (!matchedCustomWindow) {
        throw new NotFoundException('Wave availability window not found');
      }

      return {
        source: 'CUSTOM',
        startTime: matchedCustomWindow.startTime,
        endTime: matchedCustomWindow.endTime,
      };
    }

    const recurringAvailability =
      await this.recurringAvailabilityRepository.find({
        where: {
          doctor: { id: doctorId },
          dayOfWeek: this.getDayOfWeek(date),
        },
        order: { startTime: 'ASC' },
      });

    const matchedRecurringWindow = recurringAvailability.find(
      (availability) =>
        availability.startTime === startTime &&
        availability.endTime === endTime,
    );

    if (!matchedRecurringWindow) {
      throw new NotFoundException('Wave availability window not found');
    }

    return {
      source: 'RECURRING',
      startTime: matchedRecurringWindow.startTime,
      endTime: matchedRecurringWindow.endTime,
    };
  }

  private validateDate(date: string) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    const isValidDate =
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day;

    if (!isValidDate) {
      throw new BadRequestException('date must be a valid calendar date');
    }

    return date;
  }

  private validateDateIsNotPast(date: string) {
    if (date < this.today()) {
      throw new BadRequestException('date cannot be in the past');
    }
  }

  private getDayOfWeek(date: string) {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  private normalizeTime(time: string) {
    return time.length === 5 ? `${time}:00` : time;
  }

  private today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
