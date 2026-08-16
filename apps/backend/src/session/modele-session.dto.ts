import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreerModeleSessionDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class RenommerModeleSessionDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class AjouterQuestionModeleSessionDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class AjouterThemeModeleSessionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  questionIds!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReordonnerQuestionModeleSessionDto {
  @IsInt()
  @Min(0)
  position!: number;
}
