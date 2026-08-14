import { IsNotEmpty, IsString } from 'class-validator';

export class CreerEntiteDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class RenommerEntiteDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}
