import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorWaveScheduling1721900000000 implements MigrationInterface {
  name = 'AddDoctorWaveScheduling1721900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "maxPatientCapacity" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_doctor_profiles_max_patient_capacity'
        ) THEN
          ALTER TABLE "doctor_profiles"
          ADD CONSTRAINT "CHK_doctor_profiles_max_patient_capacity"
          CHECK ("maxPatientCapacity" > 0);
        END IF;
      END
      $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP CONSTRAINT IF EXISTS "CHK_doctor_profiles_max_patient_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_profiles" DROP COLUMN IF EXISTS "maxPatientCapacity"`,
    );
  }
}
