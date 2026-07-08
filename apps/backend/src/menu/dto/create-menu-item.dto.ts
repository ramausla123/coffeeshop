import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsIn(['makanan', 'minuman', 'snack'])
  category?: 'makanan' | 'minuman' | 'snack';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
