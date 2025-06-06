import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { Event, EventSchema } from '../schemas/event.schema';
import { Guest, GuestSchema } from '../schemas/guest.schema';
import { State, StateSchema } from '../schemas/state.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: Guest.name, schema: GuestSchema },
      { name: State.name, schema: StateSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema }
    ])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export UsersService so it can be used by AuthModule
})
export class UsersModule {}
