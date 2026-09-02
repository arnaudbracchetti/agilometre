import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreerEquipeDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsString()
  @IsNotEmpty()
  entiteId!: string;
}

export class RenommerEquipeDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class AjouterMembreDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsEmail()
  email!: string;
}

export class ModifierMembreDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsEmail()
  email!: string;
}
