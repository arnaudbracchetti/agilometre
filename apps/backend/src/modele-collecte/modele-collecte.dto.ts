import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreerModeleCollecteDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class RenommerModeleCollecteDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class AjouterQuestionModeleCollecteDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class AjouterThemeModeleCollecteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  questionIds!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ReordonnerQuestionModeleCollecteDto {
  @IsInt()
  @Min(0)
  position!: number;
}
