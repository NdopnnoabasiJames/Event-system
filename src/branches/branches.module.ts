import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { State, StateSchema } from '../schemas/state.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: State.name, schema: StateSchema },
      { name: Zone.name, schema: ZoneSchema },
    ])
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
