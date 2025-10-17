// import { Module } from '@nestjs/common';
// import { UsersService } from './users.service';
// import { UsersController } from './users.controller';
// import { MongooseModule } from '@nestjs/mongoose';
// import { UserSchema } from './user.schema';

// @Module({
//   providers: [UsersService],
//   controllers: [UsersController],
//   imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
//   exports: [UsersService],
// })
// export class UsersModule {}
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserSchema } from './user.schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule.register({
      // 👈 AÑADE ESTO
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 👈 opcional si lo usas en otros módulos
})
export class UsersModule {}
