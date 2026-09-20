import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreerCampagnePoulsDto {
  @IsString()
  @IsNotEmpty()
  modeleCollecteId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  joursEnvoi!: number[];

  @IsInt()
  @Min(0)
  @Max(1439)
  heureEnvoi!: number;

  @IsInt()
  @Min(1)
  questionsParEnvoi!: number;
}
