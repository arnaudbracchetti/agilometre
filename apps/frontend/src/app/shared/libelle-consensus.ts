import { CranConsensusDto } from '@agilometre/shared';

const LIBELLES: Record<CranConsensusDto, string> = {
  FORT: 'Consensus fort',
  MODERE: 'Consensus modéré',
  FAIBLE: 'Consensus faible',
};

/** Partagé entre synthese-page et lecture-fine-page — jamais deux libellés divergents pour le même cran. */
export class LibelleConsensus {
  static pour(consensus: CranConsensusDto | null): string {
    return consensus ? LIBELLES[consensus] : '';
  }
}
