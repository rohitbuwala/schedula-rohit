import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaveBookings1722000000000 implements MigrationInterface {
  name = 'CreateWaveBookings1722000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wave_bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "source" character varying NOT NULL, "waveStartTime" TIME NOT NULL, "waveEndTime" TIME NOT NULL, "tokenNumber" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "doctorId" uuid NOT NULL, "patientId" uuid NOT NULL, CONSTRAINT "UQ_wave_bookings_patient_per_wave" UNIQUE ("doctorId", "patientId", "date", "source", "waveStartTime", "waveEndTime"), CONSTRAINT "UQ_wave_bookings_token_per_wave" UNIQUE ("doctorId", "date", "source", "waveStartTime", "waveEndTime", "tokenNumber"), CONSTRAINT "PK_wave_bookings_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "wave_bookings" ADD CONSTRAINT "FK_wave_bookings_doctor_id" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wave_bookings" ADD CONSTRAINT "FK_wave_bookings_patient_id" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wave_bookings" DROP CONSTRAINT "FK_wave_bookings_patient_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wave_bookings" DROP CONSTRAINT "FK_wave_bookings_doctor_id"`,
    );
    await queryRunner.query(`DROP TABLE "wave_bookings"`);
  }
}
