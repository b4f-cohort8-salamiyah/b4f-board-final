import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// OWNER is intentionally not an allowed value here - ownership transfer is
// OPTIONAL/not CORE, see specification/PRODUCT-SCOPE.md.
export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  @IsIn(['ADMIN', 'MEMBER'])
  role: 'ADMIN' | 'MEMBER';
}
