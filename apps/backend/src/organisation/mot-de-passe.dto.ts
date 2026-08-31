import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class DemanderReinitialisationDto {
  @IsEmail()
  email!: string;
}

export class DefinirMotDePasseDto {
  @IsString()
  @IsNotEmpty()
  jeton!: string;

  @IsString()
  @IsNotEmpty()
  motDePasse!: string;
}

export class ChangerMotDePasseDto {
  @IsString()
  @IsNotEmpty()
  motDePasseActuel!: string;

  @IsString()
  @IsNotEmpty()
  nouveauMotDePasse!: string;
}
