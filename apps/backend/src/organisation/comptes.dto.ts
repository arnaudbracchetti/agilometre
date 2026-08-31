import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@agilometre/shared';

export class CreerUtilisateurDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  prenom!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsEnum(Role)
  role!: Role;
}

export class ModifierUtilisateurDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  prenom!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class AjouterHabilitationDto {
  @IsString()
  @IsNotEmpty()
  entiteId!: string;
}

export class ChangerRoleUtilisateurDto {
  @IsEnum(Role)
  role!: Role;
}
