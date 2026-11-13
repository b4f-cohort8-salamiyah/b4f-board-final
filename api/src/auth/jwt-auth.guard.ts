import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Every protected endpoint uses this guard, per
// specification/API-SPECIFICATION.md - "all endpoints except register/login
// require a valid JWT". This is the single point that decides "is there a
// valid session at all"; role/ownership checks are separate guards that
// assume this one already ran.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
