import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { accessJwtConfig } from '../../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessJwtConfig.publicKey,
    });
  }

  async validate(payload: any) {
    const { iat, exp, ...user } = payload
    return user;
  }
}
