import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Get('search')
  search(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchUsersDto) {
    return this.usersService.search(user.id, query);
  }

  @Get('me/issues')
  myIssues(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.myIssues(user.id);
  }

  @Get('me/activity')
  myActivity(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.myActivity(user.id);
  }
}
