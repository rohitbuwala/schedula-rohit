import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { User } from '../users/user.entity';
import {
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from './dto/patient-profile.dto';
import { PatientProfile } from './patient-profile.entity';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
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

  private findProfileByUserId(userId: string) {
    return this.patientProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
  }
}
