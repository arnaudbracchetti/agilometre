import { IsNotEmpty, IsString } from 'class-validator';

export class SeConnecterDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  motDePasse!: string;
}
