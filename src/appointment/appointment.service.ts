import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { CustomAvailability } from '../doctor/entity/custom-availability.entity';
import { RecurringAvailability } from '../doctor/entity/recurring-availability.entity';
import { SchedulingType } from '../doctor/scheduling-type.enum';
import { PatientProfile } from '../patient/patient-profile.entity';
import { UserRole } from '../users/user-role.enum';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './appointment-status.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

type AvailabilityWindow =
  | Pick<RecurringAvailability, 'id' | 'startTime' | 'endTime'>
  | Pick<CustomAvailability, 'id' | 'startTime' | 'endTime'>;

type ResolvedAppointmentWindow = {
  source: 'CUSTOM' | 'RECURRING';
  startTime: string;
  endTime: string;
};

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(RecurringAvailability)
    private readonly recurringAvailabilityRepository: Repository<RecurringAvailability>,
    @InjectRepository(CustomAvailability)
    private readonly customAvailabilityRepository: Repository<CustomAvailability>,
    private readonly dataSource: DataSource,
  ) {}

  async createAppointmentFromResolvedSlot(
    entityManager: EntityManager,
    input: {
      doctor: DoctorProfile;
      patient: PatientProfile;
      date: string;
      schedulingType: SchedulingType;
      source: 'CUSTOM' | 'RECURRING';
      startTime: string;
      endTime: string;
      tokenNumber?: number;
    },
  ) {
    const existingPatientAppointment = await entityManager
      .getRepository(Appointment)
      .findOne({
        where: {
          doctor: { id: input.doctor.id },
          patient: { id: input.patient.id },
          date: input.date,
          schedulingType: input.schedulingType,
          source: input.source,
          startTime: input.startTime,
          endTime: input.endTime,
          status: AppointmentStatus.BOOKED,
        },
        relations: { doctor: true, patient: true },
      });

    if (existingPatientAppointment) {
      throw new ConflictException('Patient has already booked this slot');
    }

    const appointment = entityManager.getRepository(Appointment).create({
      doctor: input.doctor,
      patient: input.patient,
      date: input.date,
      schedulingType: input.schedulingType,
      source: input.source,
      startTime: input.startTime,
      endTime: input.endTime,
      tokenNumber: input.tokenNumber,
      status: AppointmentStatus.BOOKED,
    });

    const savedAppointment = await entityManager
      .getRepository(Appointment)
      .save(appointment);

    return {
      id: savedAppointment.id,
      doctorId: input.doctor.id,
      patientId: input.patient.id,
      date: savedAppointment.date,
      schedulingType: savedAppointment.schedulingType,
      source: savedAppointment.source,
      startTime: savedAppointment.startTime,
      endTime: savedAppointment.endTime,
      tokenNumber: savedAppointment.tokenNumber,
      status: savedAppointment.status,
    };
  }

  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const patient = await this.patientProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const doctor = await this.doctorProfileRepository.findOne({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    const date = this.validateDate(dto.date);
    this.validateDateIsNotPast(date);

    const requestedStartTime = this.normalizeTime(dto.startTime);
    const requestedEndTime = this.normalizeTime(dto.endTime);

    if (
      this.timeToMinutes(requestedStartTime) >=
      this.timeToMinutes(requestedEndTime)
    ) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const appointmentWindow =
      doctor.schedulingType === SchedulingType.WAVE
        ? await this.resolveWaveWindow(
            doctor.id,
            date,
            requestedStartTime,
            requestedEndTime,
          )
        : await this.resolveStreamSlot(
            doctor,
            date,
            requestedStartTime,
            requestedEndTime,
          );

    return this.dataSource.transaction(async (entityManager) => {
      await entityManager
        .getRepository(DoctorProfile)
        .createQueryBuilder('doctor')
        .setLock('pessimistic_write')
        .where('doctor.id = :doctorId', { doctorId: doctor.id })
        .getOne();

      const existingPatientAppointment = await entityManager
        .getRepository(Appointment)
        .findOne({
          where: {
            doctor: { id: doctor.id },
            patient: { id: patient.id },
            date,
            schedulingType: doctor.schedulingType,
            source: appointmentWindow.source,
            startTime: appointmentWindow.startTime,
            endTime: appointmentWindow.endTime,
            status: AppointmentStatus.BOOKED,
          },
          relations: { doctor: true, patient: true },
        });

      if (existingPatientAppointment) {
        throw new ConflictException('Patient has already booked this slot');
      }

      const tokenNumber =
        doctor.schedulingType === SchedulingType.WAVE
          ? await this.reserveWaveToken(
              entityManager,
              doctor,
              appointmentWindow,
              date,
            )
          : await this.reserveStreamSlot(
              entityManager,
              doctor,
              appointmentWindow,
              date,
            );

      return this.createAppointmentFromResolvedSlot(entityManager, {
        doctor,
        patient,
        date,
        schedulingType: doctor.schedulingType,
        source: appointmentWindow.source,
        startTime: appointmentWindow.startTime,
        endTime: appointmentWindow.endTime,
        tokenNumber,
      });
    });
  }

  async getMyAppointments(userId: string) {
    const patient = await this.patientProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.appointmentRepository.find({
      where: { patient: { id: patient.id } },
      relations: { doctor: true, patient: true },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async getDoctorAppointments(userId: string) {
    const doctor = await this.doctorProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.appointmentRepository.find({
      where: { doctor: { id: doctor.id } },
      relations: { doctor: true, patient: true },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async cancelAppointment(user: AuthenticatedUser, appointmentId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: {
        doctor: { user: true },
        patient: { user: true },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (
      user.role === UserRole.PATIENT &&
      appointment.patient.user.id !== user.id
    ) {
      throw new ForbiddenException('Cannot cancel this appointment');
    }

    if (
      user.role === UserRole.DOCTOR &&
      appointment.doctor.user.id !== user.id
    ) {
      throw new ForbiddenException('Cannot cancel this appointment');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ConflictException('Appointment is already cancelled');
    }

    this.validateAppointmentChangeCutoff(appointment, 'cancelled');

    appointment.status = AppointmentStatus.CANCELLED;
    const savedAppointment =
      await this.appointmentRepository.save(appointment);

    return {
      id: savedAppointment.id,
      status: savedAppointment.status,
    };
  }

  async rescheduleAppointment(
    user: AuthenticatedUser,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ) {
    const date = this.validateDate(dto.date);
    this.validateDateIsNotPast(date);

    const requestedStartTime = this.normalizeTime(dto.startTime);
    const requestedEndTime = this.normalizeTime(dto.endTime);

    if (
      this.timeToMinutes(requestedStartTime) >=
      this.timeToMinutes(requestedEndTime)
    ) {
      throw new BadRequestException('startTime must be before endTime');
    }

    if (
      date === this.today() &&
      this.timeToMinutes(requestedStartTime) <= this.currentTimeInMinutes()
    ) {
      throw new BadRequestException('Appointment slot cannot be in the past');
    }

    return this.dataSource.transaction(async (entityManager) => {
      const appointment = await entityManager
        .getRepository(Appointment)
        .createQueryBuilder('appointment')
        .setLock('pessimistic_write')
        .where('appointment.id = :appointmentId', { appointmentId })
        .getOne();

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      const appointmentWithRelations = await entityManager
        .getRepository(Appointment)
        .findOne({
          where: { id: appointmentId },
          relations: {
            doctor: { user: true },
            patient: { user: true },
          },
        });

      if (!appointmentWithRelations) {
        throw new NotFoundException('Appointment not found');
      }

      appointment.doctor = appointmentWithRelations.doctor;
      appointment.patient = appointmentWithRelations.patient;

      if (
        user.role === UserRole.PATIENT &&
        appointment.patient.user.id !== user.id
      ) {
        throw new ForbiddenException('Cannot reschedule this appointment');
      }

      if (
        user.role === UserRole.DOCTOR &&
        appointment.doctor.user.id !== user.id
      ) {
        throw new ForbiddenException('Cannot reschedule this appointment');
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new ConflictException(
          'Cancelled appointments cannot be rescheduled',
        );
      }

      this.validateAppointmentChangeCutoff(appointment, 'rescheduled');

      if (
        appointment.date === date &&
        appointment.startTime === requestedStartTime &&
        appointment.endTime === requestedEndTime
      ) {
        throw new ConflictException('Cannot reschedule to the same slot');
      }

      const doctor = appointment.doctor;
      const schedulingType = appointment.schedulingType;
      const appointmentWindow =
        schedulingType === SchedulingType.WAVE
          ? await this.resolveWaveWindow(
              doctor.id,
              date,
              requestedStartTime,
              requestedEndTime,
            )
          : await this.resolveStreamSlot(
              doctor,
              date,
              requestedStartTime,
              requestedEndTime,
            );

      await entityManager
        .getRepository(DoctorProfile)
        .createQueryBuilder('doctor')
        .setLock('pessimistic_write')
        .where('doctor.id = :doctorId', { doctorId: doctor.id })
        .getOne();

      const existingPatientAppointment = await entityManager
        .getRepository(Appointment)
        .findOne({
          where: {
            id: Not(appointment.id),
            doctor: { id: doctor.id },
            patient: { id: appointment.patient.id },
            date,
            schedulingType,
            source: appointmentWindow.source,
            startTime: appointmentWindow.startTime,
            endTime: appointmentWindow.endTime,
            status: AppointmentStatus.BOOKED,
          },
          relations: { doctor: true, patient: true },
        });

      if (existingPatientAppointment) {
        throw new ConflictException('Patient has already booked this slot');
      }

      appointment.date = date;
      appointment.schedulingType = schedulingType;
      appointment.source = appointmentWindow.source;
      appointment.startTime = appointmentWindow.startTime;
      appointment.endTime = appointmentWindow.endTime;
      appointment.tokenNumber =
        schedulingType === SchedulingType.WAVE
          ? await this.reserveWaveToken(
              entityManager,
              doctor,
              appointmentWindow,
              date,
            )
          : await this.reserveStreamSlot(
              entityManager,
              doctor,
              appointmentWindow,
              date,
            );

      const savedAppointment = await entityManager
        .getRepository(Appointment)
        .save(appointment);

      return {
        id: savedAppointment.id,
        doctorId: doctor.id,
        patientId: appointment.patient.id,
        date: savedAppointment.date,
        schedulingType: savedAppointment.schedulingType,
        source: savedAppointment.source,
        startTime: savedAppointment.startTime,
        endTime: savedAppointment.endTime,
        tokenNumber: savedAppointment.tokenNumber,
        status: savedAppointment.status,
      };
    });
  }

  async reassignAppointmentsForAvailabilityUpdate(
    entityManager: EntityManager,
    doctor: DoctorProfile,
    appointments: Appointment[],
  ) {
    appointmentsLoop: for (const appointment of appointments) {
      const isWave = appointment.schedulingType === SchedulingType.WAVE;
      const availabilityWindows = await this.findAvailabilityWindows(
        doctor.id,
        appointment.date,
        entityManager,
      );
      const candidates = isWave
        ? availabilityWindows.windows
        : this.generateStreamAppointmentSlots(
            appointment.date,
            availabilityWindows.windows,
            doctor.slotDurationMinutes,
            doctor.bufferTimeMinutes,
          );

      for (const candidate of candidates) {
        try {
          const appointmentWindow = isWave
            ? await this.resolveWaveWindow(
                doctor.id,
                appointment.date,
                candidate.startTime,
                candidate.endTime,
                entityManager,
              )
            : await this.resolveStreamSlot(
                doctor,
                appointment.date,
                candidate.startTime,
                candidate.endTime,
                entityManager,
              );

          const existingPatientAppointment = await entityManager
            .getRepository(Appointment)
            .findOne({
              where: {
                id: Not(appointment.id),
                doctor: { id: doctor.id },
                patient: { id: appointment.patient.id },
                date: appointment.date,
                schedulingType: appointment.schedulingType,
                source: appointmentWindow.source,
                startTime: appointmentWindow.startTime,
                endTime: appointmentWindow.endTime,
                status: AppointmentStatus.BOOKED,
              },
              relations: { doctor: true, patient: true },
            });

          if (existingPatientAppointment) {
            continue;
          }

          appointment.source = appointmentWindow.source;
          appointment.startTime = appointmentWindow.startTime;
          appointment.endTime = appointmentWindow.endTime;
          appointment.tokenNumber = isWave
            ? await this.reserveWaveToken(
                entityManager,
                doctor,
                appointmentWindow,
                appointment.date,
              )
            : await this.reserveStreamSlot(
                entityManager,
                doctor,
                appointmentWindow,
                appointment.date,
              );

          await entityManager.getRepository(Appointment).save(appointment);
          continue appointmentsLoop;
        } catch (error) {
          if (error instanceof ConflictException) {
            continue;
          }

          throw error;
        }
      }

      throw new ConflictException(
        'Availability update affects existing appointments that could not be reassigned',
      );
    }
  }

  private async reserveWaveToken(
    entityManager: EntityManager,
    doctor: DoctorProfile,
    appointmentWindow: ResolvedAppointmentWindow,
    date: string,
  ) {
    this.validateMaxPatientCapacity(doctor.maxPatientCapacity);

    const existingAppointmentCount = await entityManager
      .getRepository(Appointment)
      .count({
        where: {
          doctor: { id: doctor.id },
          date,
          schedulingType: SchedulingType.WAVE,
          source: appointmentWindow.source,
          startTime: appointmentWindow.startTime,
          endTime: appointmentWindow.endTime,
          status: AppointmentStatus.BOOKED,
        },
        relations: { doctor: true },
      });

    if (existingAppointmentCount >= doctor.maxPatientCapacity) {
      throw new ConflictException('Wave is full');
    }

    const latestAppointment = await entityManager
      .getRepository(Appointment)
      .findOne({
        where: {
          doctor: { id: doctor.id },
          date,
          schedulingType: SchedulingType.WAVE,
          source: appointmentWindow.source,
          startTime: appointmentWindow.startTime,
          endTime: appointmentWindow.endTime,
          status: AppointmentStatus.BOOKED,
        },
        relations: { doctor: true },
        order: { tokenNumber: 'DESC' },
      });

    return latestAppointment ? (latestAppointment.tokenNumber ?? 0) + 1 : 1;
  }

  private async reserveStreamSlot(
    entityManager: EntityManager,
    doctor: DoctorProfile,
    appointmentWindow: ResolvedAppointmentWindow,
    date: string,
  ) {
    const existingAppointment = await entityManager
      .getRepository(Appointment)
      .findOne({
        where: {
          doctor: { id: doctor.id },
          date,
          schedulingType: SchedulingType.STREAM,
          source: appointmentWindow.source,
          startTime: appointmentWindow.startTime,
          endTime: appointmentWindow.endTime,
          status: AppointmentStatus.BOOKED,
        },
        relations: { doctor: true },
      });

    if (existingAppointment) {
      throw new ConflictException('Appointment slot is already booked');
    }

    return undefined;
  }

  private async resolveWaveWindow(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    entityManager?: EntityManager,
  ): Promise<ResolvedAppointmentWindow> {
    const availabilityWindows = await this.findAvailabilityWindows(
      doctorId,
      date,
      entityManager,
    );
    const matchedWindow = availabilityWindows.windows.find(
      (availability) =>
        availability.startTime === startTime && availability.endTime === endTime,
    );

    if (!matchedWindow) {
      throw new NotFoundException('Wave availability window not found');
    }

    return {
      source: availabilityWindows.source,
      startTime: matchedWindow.startTime,
      endTime: matchedWindow.endTime,
    };
  }

  private async resolveStreamSlot(
    doctor: DoctorProfile,
    date: string,
    startTime: string,
    endTime: string,
    entityManager?: EntityManager,
  ): Promise<ResolvedAppointmentWindow> {
    this.validateSchedulingSettings(
      doctor.slotDurationMinutes,
      doctor.bufferTimeMinutes,
    );

    const availabilityWindows = await this.findAvailabilityWindows(
      doctor.id,
      date,
      entityManager,
    );
    this.validateAvailabilityWindowsDoNotOverlap(availabilityWindows.windows);

    const matchedSlot = this.generateStreamAppointmentSlots(
      date,
      availabilityWindows.windows,
      doctor.slotDurationMinutes,
      doctor.bufferTimeMinutes,
    ).find((slot) => slot.startTime === startTime && slot.endTime === endTime);

    if (!matchedSlot) {
      throw new NotFoundException('Appointment slot not found');
    }

    return {
      source: availabilityWindows.source,
      startTime: matchedSlot.startTime,
      endTime: matchedSlot.endTime,
    };
  }

  private async findAvailabilityWindows(
    doctorId: string,
    date: string,
    entityManager?: EntityManager,
  ) {
    const customAvailabilityRepository =
      entityManager?.getRepository(CustomAvailability) ??
      this.customAvailabilityRepository;
    const recurringAvailabilityRepository =
      entityManager?.getRepository(RecurringAvailability) ??
      this.recurringAvailabilityRepository;
    const customAvailability = await customAvailabilityRepository.find({
      where: { doctor: { id: doctorId }, date },
      order: { startTime: 'ASC' },
    });

    if (customAvailability.length > 0) {
      return {
        source: 'CUSTOM' as const,
        windows: customAvailability,
      };
    }

    return {
      source: 'RECURRING' as const,
      windows: await recurringAvailabilityRepository.find({
        where: {
          doctor: { id: doctorId },
          dayOfWeek: this.getDayOfWeek(date),
        },
        order: { startTime: 'ASC' },
      }),
    };
  }

  private validateMaxPatientCapacity(maxPatientCapacity: number) {
    if (!Number.isInteger(maxPatientCapacity) || maxPatientCapacity <= 0) {
      throw new BadRequestException(
        'maxPatientCapacity must be an integer greater than 0',
      );
    }
  }

  private validateSchedulingSettings(
    slotDurationMinutes: number,
    bufferTimeMinutes: number,
  ) {
    if (
      !Number.isInteger(slotDurationMinutes) ||
      slotDurationMinutes < 1 ||
      slotDurationMinutes > 480
    ) {
      throw new BadRequestException(
        'slotDurationMinutes must be an integer between 1 and 480',
      );
    }

    if (
      !Number.isInteger(bufferTimeMinutes) ||
      bufferTimeMinutes < 0 ||
      bufferTimeMinutes > 240
    ) {
      throw new BadRequestException(
        'bufferTimeMinutes must be an integer between 0 and 240',
      );
    }
  }

  private validateAvailabilityWindowsDoNotOverlap(
    availabilityWindows: AvailabilityWindow[],
  ) {
    const sortedWindows = [...availabilityWindows].sort(
      (firstWindow, secondWindow) =>
        this.timeToMinutes(firstWindow.startTime) -
        this.timeToMinutes(secondWindow.startTime),
    );

    for (let index = 1; index < sortedWindows.length; index += 1) {
      const previousWindow = sortedWindows[index - 1];
      const currentWindow = sortedWindows[index];

      if (
        this.timeToMinutes(previousWindow.endTime) >
        this.timeToMinutes(currentWindow.startTime)
      ) {
        throw new ConflictException(
          'Availability slots overlap and cannot be used for scheduling',
        );
      }
    }
  }

  private validateAppointmentChangeCutoff(
    appointment: Appointment,
    action: 'cancelled' | 'rescheduled',
  ) {
    if (appointment.date < this.today()) {
      throw new BadRequestException(`Past appointments cannot be ${action}`);
    }

    if (
      appointment.date === this.today() &&
      this.timeToMinutes(appointment.startTime) - this.currentTimeInMinutes() <=
        30
    ) {
      throw new BadRequestException(
        `Appointments cannot be ${action} within 30 minutes of start time`,
      );
    }
  }

  private generateStreamAppointmentSlots(
    date: string,
    availabilityWindows: AvailabilityWindow[],
    slotDurationMinutes: number,
    bufferTimeMinutes: number,
  ) {
    const slots = availabilityWindows.flatMap((availabilityWindow) => {
      const generatedSlots: Array<{ startTime: string; endTime: string }> = [];
      const windowEnd = this.timeToMinutes(availabilityWindow.endTime);
      let slotStart = this.timeToMinutes(availabilityWindow.startTime);

      while (slotStart + slotDurationMinutes <= windowEnd) {
        generatedSlots.push({
          startTime: this.minutesToTime(slotStart),
          endTime: this.minutesToTime(slotStart + slotDurationMinutes),
        });
        slotStart += slotDurationMinutes + bufferTimeMinutes;
      }

      return generatedSlots;
    });

    if (date !== this.today()) {
      return slots;
    }

    const currentTimeInMinutes = this.currentTimeInMinutes();

    return slots.filter(
      (slot) => this.timeToMinutes(slot.startTime) > currentTimeInMinutes,
    );
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

  private timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private minutesToTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}:00`;
  }

  private today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private currentTimeInMinutes() {
    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();
  }
}
