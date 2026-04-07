import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhrasePairsController } from './phrase-pairs.controller';
import { PhrasePairsService } from './phrase-pairs.service';
import { PhrasePairSchema } from './schema/phrase-pair.schema';
import { RolesGuard } from '../auth/roles.guard';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PhrasePair', schema: PhrasePairSchema },
    ]),
    CommonModule,
  ],
  controllers: [PhrasePairsController],
  providers: [PhrasePairsService, RolesGuard],
  exports: [PhrasePairsService],
})
export class PhrasePairsModule {}
