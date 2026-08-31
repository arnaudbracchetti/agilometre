import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodemailerMailSender } from './nodemailer-mail-sender';

@Module({
  imports: [ConfigModule],
  exports: [NodemailerMailSender],
  providers: [
    {
      provide: NodemailerMailSender,
      useFactory: (config: ConfigService) => new NodemailerMailSender(config),
      inject: [ConfigService],
    },
  ],
})
export class MailModule {}
