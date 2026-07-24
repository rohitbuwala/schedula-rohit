import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { User } from '../users/user.entity';
import { DoctorProfile } from './doctor-profile.entity';
import {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
} from './dto/doctor-profile.dto';
import { CreateCustomAvailabilityDto } from './dto/custom-availability.dto';
import {
  CreateRecurringAvailabilityDto,
  UpdateRecurringAvailabilityDto,
} from './dto/recurring-availability.dto';
import { GetWaveAvailabilityQueryDto } from './dto/wave-availability-query.dto';
import { CustomAvailability } from './entity/custom-availability.entity';
import { RecurringAvailability } from './entity/recurring-availability.entity';
import { SchedulingType } from './scheduling-type.enum';

type AvailabilityWindow =
  | Pick<RecurringAvailability, 'id' | 'startTime' | 'endTime'>
  | Pick<CustomAvailability, 'id' | 'startTime' | 'endTime'>;

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(RecurringAvailability)
    private readonly recurringAvailabilityRepository: Repository<RecurringAvailability>,
    @InjectRepository(CustomAvailability)
    private readonly customAvailabilityRepository: Repository<CustomAvailability>,
  ) {}

  async createProfile(user: AuthenticatedUser, dto: CreateDoctorProfileDto) {
    const existingProfile = await this.findProfileByUserId(user.id);

    if (existingProfile) {
      throw new ConflictException('Doctor profile already exists');
    }

    this.validateMaxPatientCapacity(dto.maxPatientCapacity ?? 1);

    const profile = this.doctorProfileRepository.create({
      ...dto,
      user: { id: user.id } as User,
    });

    return this.doctorProfileRepository.save(profile);
  }

  async getProfile(userId: string) {
    const profile = await this.findProfileByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateDoctorProfileDto) {
    const profile = await this.getProfile(userId);
    this.validateMaxPatientCapacity(
      dto.maxPatientCapacity ?? profile.maxPatientCapacity,
    );

    Object.assign(profile, dto);

    return this.doctorProfileRepository.save(profile);
  }

  async createAvailability(
    userId: string,
    dto: CreateRecurringAvailabilityDto,
  ) {
    const doctor = await this.getProfile(userId);
    const availability = {
      ...dto,
      startTime: this.normalizeTime(dto.startTime),
      endTime: this.normalizeTime(dto.endTime),
    };

    await this.validateAvailabilitySlot(doctor.id, availability);

    return this.recurringAvailabilityRepository.save(
      this.recurringAvailabilityRepository.create({
        ...availability,
        doctor,
      }),
    );
  }

  async getAvailability(userId: string) {
    const doctor = await this.getProfile(userId);

    return this.recurringAvailabilityRepository.find({
      where: { doctor: { id: doctor.id } },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async createAvailabilityOverride(
    userId: string,
    dto: CreateCustomAvailabilityDto,
  ) {
    const doctor = await this.getProfile(userId);
    const date = this.validateDate(dto.date);
    const availability = {
      date,
      startTime: this.normalizeTime(dto.startTime),
      endTime: this.normalizeTime(dto.endTime),
    };

    await this.validateCustomAvailabilitySlot(doctor.id, availability);

    return this.customAvailabilityRepository.save(
      this.customAvailabilityRepository.create({
        ...availability,
        doctor,
      }),
    );
  }

  async getAvailabilityForDate(
    userId: string,
    query: GetWaveAvailabilityQueryDto,
  ) {
    const doctor = await this.getProfile(userId);
    const date = this.validateDate(query.date);
    const customAvailability = await this.customAvailabilityRepository.find({
      where: { doctor: { id: doctor.id }, date },
      order: { startTime: 'ASC' },
    });

    if (doctor.schedulingType !== SchedulingType.WAVE) {
      if (customAvailability.length > 0) {
        return {
          date,
          source: 'CUSTOM',
          slots: customAvailability,
        };
      }

      const recurringAvailability =
        await this.recurringAvailabilityRepository.find({
          where: {
            doctor: { id: doctor.id },
            dayOfWeek: this.getDayOfWeek(date),
          },
          order: { startTime: 'ASC' },
        });

      return {
        date,
        source: 'RECURRING',
        slots: recurringAvailability,
      };
    }

    this.validateMaxPatientCapacity(doctor.maxPatientCapacity);
    this.validateDateIsNotPast(date);

    const bookedPatientsByAvailabilityId = this.parseBookedPatients(
      query.bookedPatients,
    );

    if (customAvailability.length > 0) {
      return {
        date,
        source: 'CUSTOM',
        schedulingType: doctor.schedulingType,
        availabilityWindow: this.buildWaveAvailabilityWindows(
          customAvailability,
          doctor.maxPatientCapacity,
          bookedPatientsByAvailabilityId,
        ),
      };
    }

    const recurringAvailability =
      await this.recurringAvailabilityRepository.find({
        where: {
          doctor: { id: doctor.id },
          dayOfWeek: this.getDayOfWeek(date),
        },
        order: { startTime: 'ASC' },
      });

    return {
      date,
      source: 'RECURRING',
      schedulingType: doctor.schedulingType,
      availabilityWindow: this.buildWaveAvailabilityWindows(
        recurringAvailability,
        doctor.maxPatientCapacity,
        bookedPatientsByAvailabilityId,
      ),
    };
  }

  async updateAvailability(
    userId: string,
    availabilityId: string,
    dto: UpdateRecurringAvailabilityDto,
  ) {
    const doctor = await this.getProfile(userId);
    const availability = await this.findAvailabilityForDoctor(
      doctor.id,
      availabilityId,
    );

    const updatedSlot = {
      dayOfWeek: dto.dayOfWeek ?? availability.dayOfWeek,
      startTime: this.normalizeTime(dto.startTime ?? availability.startTime),
      endTime: this.normalizeTime(dto.endTime ?? availability.endTime),
    };

    await this.validateAvailabilitySlot(
      doctor.id,
      updatedSlot,
      availability.id,
    );

    Object.assign(availability, updatedSlot);

    return this.recurringAvailabilityRepository.save(availability);
  }

  async deleteAvailability(userId: string, availabilityId: string) {
    const doctor = await this.getProfile(userId);
    const availability = await this.findAvailabilityForDoctor(
      doctor.id,
      availabilityId,
    );

    await this.recurringAvailabilityRepository.remove(availability);
  }

  private findProfileByUserId(userId: string) {
    return this.doctorProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
  }

  private async findAvailabilityForDoctor(
    doctorId: string,
    availabilityId: string,
  ) {
    const availability = await this.recurringAvailabilityRepository.findOne({
      where: { id: availabilityId, doctor: { id: doctorId } },
    });

    if (!availability) {
      throw new NotFoundException('Availability slot not found');
    }

    return availability;
  }

  private async validateAvailabilitySlot(
    doctorId: string,
    slot: Pick<RecurringAvailability, 'dayOfWeek' | 'startTime' | 'endTime'>,
    ignoredAvailabilityId?: string,
  ) {
    if (
      this.timeToMinutes(slot.startTime) >= this.timeToMinutes(slot.endTime)
    ) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const existingSlots = await this.recurringAvailabilityRepository.find({
      where: {
        doctor: { id: doctorId },
        dayOfWeek: slot.dayOfWeek,
      },
    });

    const conflictingSlot = existingSlots.find(
      (existingSlot) =>
        existingSlot.id !== ignoredAvailabilityId &&
        existingSlot.startTime === slot.startTime &&
        existingSlot.endTime === slot.endTime,
    );

    if (conflictingSlot) {
      throw new ConflictException('Availability slot already exists');
    }

    const hasOverlap = existingSlots.some(
      (existingSlot) =>
        existingSlot.id !== ignoredAvailabilityId &&
        this.timeToMinutes(existingSlot.startTime) <
          this.timeToMinutes(slot.endTime) &&
        this.timeToMinutes(existingSlot.endTime) >
          this.timeToMinutes(slot.startTime),
    );

    if (hasOverlap) {
      throw new ConflictException(
        'Availability slot overlaps with an existing slot',
      );
    }
  }

  private async validateCustomAvailabilitySlot(
    doctorId: string,
    slot: Pick<CustomAvailability, 'date' | 'startTime' | 'endTime'>,
  ) {
    if (
      this.timeToMinutes(slot.startTime) >= this.timeToMinutes(slot.endTime)
    ) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const existingSlots = await this.customAvailabilityRepository.find({
      where: {
        doctor: { id: doctorId },
        date: slot.date,
      },
    });

    const duplicateSlot = existingSlots.find(
      (existingSlot) =>
        existingSlot.startTime === slot.startTime &&
        existingSlot.endTime === slot.endTime,
    );

    if (duplicateSlot) {
      throw new ConflictException('Availability override already exists');
    }

    const hasOverlap = existingSlots.some(
      (existingSlot) =>
        this.timeToMinutes(existingSlot.startTime) <
          this.timeToMinutes(slot.endTime) &&
        this.timeToMinutes(existingSlot.endTime) >
          this.timeToMinutes(slot.startTime),
    );

    if (hasOverlap) {
      throw new ConflictException(
        'Availability override overlaps with an existing override',
      );
    }
  }

  private validateMaxPatientCapacity(maxPatientCapacity: number) {
    if (!Number.isInteger(maxPatientCapacity) || maxPatientCapacity <= 0) {
      throw new BadRequestException(
        'maxPatientCapacity must be an integer greater than 0',
      );
    }
  }

  private validateDateIsNotPast(date: string) {
    if (date < this.today()) {
      throw new BadRequestException('date cannot be in the past');
    }
  }

  private parseBookedPatients(bookedPatients?: string) {
    if (!bookedPatients) {
      return new Map<string, number>();
    }

    return bookedPatients.split(',').reduce((capacityMap, entry) => {
      const [availabilityId, countText] = entry
        .split(':')
        .map((value) => value.trim());

      if (!availabilityId || !countText) {
        throw new BadRequestException(
          'bookedPatients must be in availabilityId:count format',
        );
      }

      const bookedCount = Number(countText);

      if (!Number.isInteger(bookedCount) || bookedCount < 0) {
        throw new BadRequestException(
          'booked patient counts must be non-negative integers',
        );
      }

      capacityMap.set(availabilityId, bookedCount);

      return capacityMap;
    }, new Map<string, number>());
  }

  private buildWaveAvailabilityWindows(
    availabilityWindows: AvailabilityWindow[],
    maxPatientCapacity: number,
    bookedPatientsByAvailabilityId: Map<string, number>,
  ) {
    return availabilityWindows.map((availabilityWindow) => {
      const bookedPatients =
        bookedPatientsByAvailabilityId.get(availabilityWindow.id) ?? 0;

      if (bookedPatients > maxPatientCapacity) {
        throw new ConflictException(
          `Maximum patient capacity exceeded for availability window ${availabilityWindow.id}`,
        );
      }

      return {
        startTime: availabilityWindow.startTime,
        endTime: availabilityWindow.endTime,
        maxPatientCapacity,
        availableCapacity: maxPatientCapacity - bookedPatients,
      };
    });
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

  private getDayOfWeek(date: string) {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  private normalizeTime(time: string) {
    return time.length === 5 ? `${time}:00` : time;
  }

  private timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
