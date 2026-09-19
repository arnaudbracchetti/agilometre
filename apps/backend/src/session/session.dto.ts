import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreerSessionDto {
  @IsString()
  @IsNotEmpty()
  equipeId!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  modeleCollecteId!: string;
}

export class AjouterQuestionSessionDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class AjouterThemeSessionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  questionIds!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReordonnerQuestionSessionDto {
  @IsInt()
  @Min(0)
  position!: number;
}

export class ModifierInfosSessionDto {
  @IsString()
  @IsNotEmpty()
  equipeId!: string;

  @IsDateString()
  date!: string;
}

export class ChangerModeleCollecteDto {
  @IsString()
  @IsNotEmpty()
  modeleCollecteId!: string;
}

export class RejoindreSessionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  jetonPrecedent?: string;
}

export class VoterParticipantDto {
  @IsInt()
  @Min(0)
  // Question.NOMBRE_OPTIONS_REQUIS - 1 : une Question porte toujours exactement 4 Options
  // (apps/backend/src/referentiel/domain/question.ts) — valeur dupliquée ici plutôt qu'importée
  // (frontière HTTP, pas de dépendance du DTO vers le domaine Référentiel), à garder synchrone.
  @Max(3)
  optionIndex!: number;
}
