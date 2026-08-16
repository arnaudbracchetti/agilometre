import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  modeleSessionId!: string;
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
