import { LocationPoint } from './types';

// Center of Itajaí, SC (Praça da Matriz area)
export const ITAJAI_CENTER = { lat: -26.911420, lng: -48.667840 };

export const PREDEFINED_LOCATIONS: LocationPoint[] = [
  // --- ADMINISTRATIVO ---
  {
    id: 'pref-itj',
    name: 'Prefeitura Municipal de Itajaí',
    type: 'PREFEITURA',
    address: 'R. Alberto Werner, 100 - Vila Operaria',
    coords: { lat: -26.911420, lng: -48.667840 }
  },
  {
    id: 'sec-obras',
    name: 'Secretaria de Obras',
    type: 'SECRETARIA',
    address: 'R. José Pereira Liberato, 1889 - São João',
    coords: { lat: -26.902260, lng: -48.683510 }
  },
  {
    id: 'codetran',
    name: 'Codetran Itajaí',
    type: 'SECRETARIA',
    address: 'R. Dr. Reinaldo Schmithausen, 2400 - Cordeiros',
    coords: { lat: -26.890650, lng: -48.685820 }
  },

  // --- UPA (Unidade de Pronto Atendimento) ---
  {
    id: 'upa-cordeiros',
    name: 'UPA 24h Cordeiros',
    type: 'UPA',
    address: 'R. Enedina D\'Ávila Ferreira - Cordeiros',
    coords: { lat: -26.885690, lng: -48.688190 }
  },
  {
    id: 'upa-cis',
    name: 'UPA 24h CIS (São Vicente)',
    type: 'UPA',
    address: 'Av. Adolfo Konder, 33 - São Vicente',
    coords: { lat: -26.915250, lng: -48.684120 }
  },

  // --- CRAS (Assistência Social) ---
  {
    id: 'cras-itaipava',
    name: 'CRAS Itaipava',
    type: 'CRAS',
    address: 'Av. Itaipava, 4120 - Itaipava',
    coords: { lat: -26.945830, lng: -48.729650 }
  },
  {
    id: 'cras-promorar',
    name: 'CRAS Promorar',
    type: 'CRAS',
    address: 'Av. Min. Luiz Gallotti - Cidade Nova',
    coords: { lat: -26.923410, lng: -48.691230 }
  },
  {
    id: 'cras-imarui',
    name: 'CRAS Imaruí',
    type: 'CRAS',
    address: 'R. Leodegário Pedro da Silva, 550 - Imaruí',
    coords: { lat: -26.900550, lng: -48.672010 }
  },
  {
    id: 'cras-cordeiros',
    name: 'CRAS Cordeiros',
    type: 'CRAS',
    address: 'R. Dr. Reinaldo Schmithausen - Cordeiros',
    coords: { lat: -26.890120, lng: -48.685050 }
  },
  {
    id: 'cras-fazenda',
    name: 'CRAS Nossa Senhora das Graças',
    type: 'CRAS',
    address: 'R. Almirante Tamandaré - Fazenda',
    coords: { lat: -26.922040, lng: -48.655020 }
  },

  // --- UBS (Unidade Básica de Saúde) ---
  {
    id: 'ubs-fazenda',
    name: 'UBS Fazenda',
    type: 'UBS',
    address: 'R. Milton Rossi - Fazenda',
    coords: { lat: -26.920150, lng: -48.650320 }
  },
  {
    id: 'ubs-cordeiros',
    name: 'UBS Cordeiros',
    type: 'UBS',
    address: 'R. Odílio Garcia - Cordeiros',
    coords: { lat: -26.888050, lng: -48.682010 }
  },
  {
    id: 'ubs-jardim-esperanca',
    name: 'UBS Jardim Esperança',
    type: 'UBS',
    address: 'R. Sebastião Romeu Soares - Cordeiros',
    coords: { lat: -26.882040, lng: -48.690020 }
  },
  {
    id: 'ubs-sao-vicente',
    name: 'UBS São Vicente',
    type: 'UBS',
    address: 'R. Padre Roque Veriani - São Vicente',
    coords: { lat: -26.918020, lng: -48.689050 }
  },
  {
    id: 'ubs-rio-bonito',
    name: 'UBS Rio Bonito',
    type: 'UBS',
    address: 'R. Nilson Édson dos Santos - São Vicente',
    coords: { lat: -26.925010, lng: -48.695030 }
  },
  {
    id: 'ubs-cidade-nova',
    name: 'UBS Cidade Nova',
    type: 'UBS',
    address: 'Av. Agostinho Alves Ramos - Cidade Nova',
    coords: { lat: -26.930050, lng: -48.700020 }
  },
  {
    id: 'ubs-promorar',
    name: 'UBS Promorar',
    type: 'UBS',
    address: 'Av. Min. Luiz Gallotti - Cidade Nova',
    coords: { lat: -26.924030, lng: -48.692010 }
  },
  {
    id: 'ubs-itaipava',
    name: 'UBS Itaipava',
    type: 'UBS',
    address: 'Av. Itaipava - Itaipava',
    coords: { lat: -26.946020, lng: -48.730050 }
  },
  {
    id: 'ubs-pacencia',
    name: 'UBS Paciência',
    type: 'UBS',
    address: 'R. Paciência - Itaipava',
    coords: { lat: -26.955040, lng: -48.740020 }
  },
  {
    id: 'ubs-limoeiro',
    name: 'UBS Limoeiro',
    type: 'UBS',
    address: 'Estrada Geral do Limoeiro',
    coords: { lat: -26.958520, lng: -48.752310 }
  },
  {
    id: 'ubs-brilhante',
    name: 'UBS Brilhante',
    type: 'UBS',
    address: 'Estrada Geral do Brilhante',
    coords: { lat: -26.972150, lng: -48.765420 }
  },
  {
    id: 'ubs-praia-brava',
    name: 'UBS Praia Brava',
    type: 'UBS',
    address: 'R. Bráulio Werner - Praia Brava',
    coords: { lat: -26.936510, lng: -48.635420 }
  },
  {
    id: 'ubs-cabeçudas',
    name: 'UBS Cabeçudas',
    type: 'UBS',
    address: 'R. Juvêncio Tavares D\'Amaral - Cabeçudas',
    coords: { lat: -26.928150, lng: -48.618540 }
  },
  {
    id: 'ubs-salseiros',
    name: 'UBS Salseiros',
    type: 'UBS',
    address: 'Rod. Jorge Lacerda - Salseiros',
    coords: { lat: -26.895020, lng: -48.710050 }
  },
  {
    id: 'ubs-espinheiros',
    name: 'UBS Espinheiros',
    type: 'UBS',
    address: 'R. Fermino Vieira Cordeiro - Espinheiros',
    coords: { lat: -26.880410, lng: -48.705620 }
  },
  {
    id: 'ubs-portal-ii',
    name: 'UBS Portal II',
    type: 'UBS',
    address: 'R. Nilo Simas - Espinheiros',
    coords: { lat: -26.885030, lng: -48.700050 }
  },
  {
    id: 'ubs-murta',
    name: 'UBS Murta',
    type: 'UBS',
    address: 'R. Orlandina Amália Pires Corrêa - Murta',
    coords: { lat: -26.878500, lng: -48.679200 }
  },
  {
    id: 'ubs-sao-joao',
    name: 'UBS São João',
    type: 'UBS',
    address: 'R. Pedro Rangel - São João',
    coords: { lat: -26.905040, lng: -48.678020 }
  },
  {
    id: 'ubs-dom-bosco',
    name: 'UBS Dom Bosco',
    type: 'UBS',
    address: 'R. Brusque - Dom Bosco',
    coords: { lat: -26.915030, lng: -48.670050 }
  },
  {
    id: 'ubs-vila-operaria',
    name: 'UBS Vila Operária',
    type: 'UBS',
    address: 'R. João Gaya - Vila Operária',
    coords: { lat: -26.910020, lng: -48.665040 }
  },
  {
    id: 'ubs-bambuzal',
    name: 'UBS Bambuzal',
    type: 'UBS',
    address: 'R. São Joaquim - São Vicente',
    coords: { lat: -26.912050, lng: -48.695020 }
  }
];

export const MAP_STYLES = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  }
];