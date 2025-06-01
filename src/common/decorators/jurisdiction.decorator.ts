import { SetMetadata } from '@nestjs/common';

export const JURISDICTION_KEY = 'jurisdiction';
export const RequireJurisdiction = (...jurisdictions: string[]) => 
  SetMetadata(JURISDICTION_KEY, jurisdictions);
