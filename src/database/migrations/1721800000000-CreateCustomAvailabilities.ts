import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomAvailabilities1721800000000
  implements MigrationInterface
{
  name = 'CreateCustomAvailabilities1721800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "custom_availabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "doctorId" uuid NOT NULL, CONSTRAINT "CHK_custom_availabilities_time_order" CHECK ("startTime" < "endTime"), CONSTRAINT "UQ_custom_availabilities_doctor_date_time" UNIQUE ("doctorId", "date", "startTime", "endTime"), CONSTRAINT "PK_custom_availabilities_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" ADD CONSTRAINT "FK_custom_availabilities_doctor_id" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" DROP CONSTRAINT "FK_custom_availabilities_doctor_id"`,
    );
    await queryRunner.query(`DROP TABLE "custom_availabilities"`);
  }
}
