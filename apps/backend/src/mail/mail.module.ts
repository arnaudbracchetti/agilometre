import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FilesystemTemplateRepository } from './infrastructure/filesystem-template.repository';
import { NodemailerMailSender } from './infrastructure/nodemailer-mail-sender';
import { ValiderTemplatesEmail } from './infrastructure/valider-templates-email';

@Module({
  imports: [ConfigModule],
  exports: [NodemailerMailSender],
  providers: [
    FilesystemTemplateRepository,
    {
      provide: NodemailerMailSender,
      useFactory: (
        config: ConfigService,
        templates: FilesystemTemplateRepository,
      ) => new NodemailerMailSender(config, templates),
      inject: [ConfigService, FilesystemTemplateRepository],
    },
    {
      provide: ValiderTemplatesEmail,
      useFactory: (templates: FilesystemTemplateRepository) =>
        new ValiderTemplatesEmail(templates),
      inject: [FilesystemTemplateRepository],
    },
  ],
})
export class MailModule {}
