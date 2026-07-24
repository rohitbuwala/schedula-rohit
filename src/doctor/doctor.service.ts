import {
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

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  async createProfile(user: AuthenticatedUser, dto: CreateDoctorProfileDto) {
    const existingProfile = await this.findProfileByUserId(user.id);

    if (existingProfile) {
      throw new ConflictException('Doctor profile already exists');
    }

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
    Object.assign(profile, dto);

    return this.doctorProfileRepository.save(profile);
  }

  private findProfileByUserId(userId: string) {
    return this.doctorProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
  }
}
