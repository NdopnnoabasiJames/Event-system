import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';
import { State, StateSchema } from '../schemas/state.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: State.name, schema: StateSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema }
    ])
  ],
  controllers: [StatesController],
  providers: [StatesService],
  exports: [StatesService],
})
export class StatesModule {}
