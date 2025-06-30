// Mock data for Nigerian States, Branches, and Zones
// This data represents a realistic church hierarchy structure across Nigeria

export interface MockState {
  name: string;
  geopoliticalZone: string;
  branches: MockBranch[];
}

export interface MockBranch {
  name: string;
  address: string;
  zones: MockZone[];
  totalScore: number;
  totalInvitedGuests: number;
  totalCheckedInGuests: number;
  workersCount: number;
  status: string;
}

export interface MockZone {
  name: string;
  description: string;
}

export const NIGERIA_HIERARCHY_DATA: MockState[] = [
  // NORTH CENTRAL
  {
    name: "Federal Capital Territory",
    geopoliticalZone: "North Central",
    branches: [
      {
        name: "Abuja Central Branch",
        address: "Central Business District, Abuja",
        zones: [
          { name: "Garki Zone", description: "Garki Area Council and surrounding districts" },
          { name: "Wuse Zone", description: "Wuse 1 & 2, Utako, Jabi areas" },
          { name: "Maitama Zone", description: "Maitama, Asokoro, Three Arms Zone" },
          { name: "Gwarinpa Zone", description: "Gwarinpa, Kado, Life Camp areas" },
          { name: "Kubwa Zone", description: "Kubwa, Bwari, Dutse areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Gwagwalada Branch",
        address: "Gwagwalada Area Council, FCT",
        zones: [
          { name: "Gwagwalada Central Zone", description: "Gwagwalada town center" },
          { name: "University Zone", description: "University of Abuja and surrounding areas" },
          { name: "Dobi Zone", description: "Dobi, Ikwa, and neighboring communities" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Plateau",
    geopoliticalZone: "North Central",
    branches: [
      {
        name: "Jos North Branch",
        address: "Jos North LGA, Plateau State",
        zones: [
          { name: "Jos Central Zone", description: "Jos city center and commercial areas" },
          { name: "Bukuru Zone", description: "Bukuru and surrounding mining communities" },
          { name: "Vom Zone", description: "Vom, NVRI area, and agricultural settlements" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Jos South Branch",
        address: "Jos South LGA, Plateau State",
        zones: [
          { name: "Rayfield Zone", description: "Rayfield, Anglo Jos, and residential areas" },
          { name: "Du Zone", description: "Du district and surrounding communities" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Niger",
    geopoliticalZone: "North Central",
    branches: [
      {
        name: "Minna Branch",
        address: "Minna, Niger State",
        zones: [
          { name: "Minna Central Zone", description: "Minna city center and government areas" },
          { name: "Chanchaga Zone", description: "Chanchaga, Tunga, and surrounding areas" },
          { name: "Bosso Zone", description: "Bosso, FUT Minna, and academic district" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },

  // SOUTH WEST
  {
    name: "Lagos",
    geopoliticalZone: "South West",
    branches: [
      {
        name: "Lagos Island Branch",
        address: "Lagos Island, Lagos State",
        zones: [
          { name: "Victoria Island Zone", description: "Victoria Island and Ikoyi business district" },
          { name: "Lagos Island Zone", description: "Lagos Island, Marina, and commercial core" },
          { name: "Lekki Zone", description: "Lekki Peninsula, Ajah, and coastal areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Lagos Mainland Branch",
        address: "Lagos Mainland, Lagos State",
        zones: [
          { name: "Yaba Zone", description: "Yaba, Akoka, and University of Lagos area" },
          { name: "Surulere Zone", description: "Surulere, Iponri, and residential districts" },
          { name: "Ikeja Zone", description: "Ikeja, Allen Avenue, and airport area" },
          { name: "Maryland Zone", description: "Maryland, Anthony, and Gbagada areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Alimosho Branch",
        address: "Alimosho LGA, Lagos State",
        zones: [
          { name: "Igando Zone", description: "Igando, Ikotun, and Egbe areas" },
          { name: "Iyana Ipaja Zone", description: "Iyana Ipaja, Abule Egba, and Agege border" },
          { name: "Akowonjo Zone", description: "Akowonjo, Dopemu, and Agege areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Ogun",
    geopoliticalZone: "South West",
    branches: [
      {
        name: "Abeokuta Branch",
        address: "Abeokuta, Ogun State",
        zones: [
          { name: "Abeokuta Central Zone", description: "Abeokuta city center and Olumo Rock area" },
          { name: "Obantoko Zone", description: "Obantoko, Adatan, and residential areas" },
          { name: "Kuto Zone", description: "Kuto, Lafenwa, and commercial districts" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Ijebu Ode Branch",
        address: "Ijebu Ode, Ogun State",
        zones: [
          { name: "Ijebu Central Zone", description: "Ijebu Ode town center and traditional areas" },
          { name: "Molipa Zone", description: "Molipa, Ago-Iwoye, and educational district" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Oyo",
    geopoliticalZone: "South West",
    branches: [
      {
        name: "Ibadan North Branch",
        address: "Ibadan North LGA, Oyo State",
        zones: [
          { name: "University Zone", description: "University of Ibadan and Bodija areas" },
          { name: "Agodi Zone", description: "Agodi, GRA, and government residential area" },
          { name: "Mokola Zone", description: "Mokola, Sango, and commercial areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Ibadan South West Branch",
        address: "Ibadan South West LGA, Oyo State",
        zones: [
          { name: "Ring Road Zone", description: "Ring Road, Challenge, and Felele areas" },
          { name: "Oke-Ado Zone", description: "Oke-Ado, Beere, and traditional core areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },

  // SOUTH EAST
  {
    name: "Anambra",
    geopoliticalZone: "South East",
    branches: [
      {
        name: "Awka Branch",
        address: "Awka, Anambra State",
        zones: [
          { name: "Awka Central Zone", description: "Awka city center and government areas" },
          { name: "Unizik Zone", description: "Nnamdi Azikiwe University and academic areas" },
          { name: "Amawbia Zone", description: "Amawbia, Amaenyi, and surrounding communities" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Onitsha Branch",
        address: "Onitsha, Anambra State",
        zones: [
          { name: "Onitsha Main Market Zone", description: "Main Market and commercial district" },
          { name: "Bridgehead Zone", description: "Niger Bridge head and transport hub" },
          { name: "Fegge Zone", description: "Fegge, New Parts, and residential areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Enugu",
    geopoliticalZone: "South East",
    branches: [
      {
        name: "Enugu Central Branch",
        address: "Enugu North LGA, Enugu State",
        zones: [
          { name: "Coal City Zone", description: "Enugu city center and coal mine areas" },
          { name: "Independence Layout Zone", description: "Independence Layout and GRA areas" },
          { name: "New Haven Zone", description: "New Haven, Ogbete, and market areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },

  // SOUTH SOUTH
  {
    name: "Rivers",
    geopoliticalZone: "South South",
    branches: [
      {
        name: "Port Harcourt Branch",
        address: "Port Harcourt, Rivers State",
        zones: [
          { name: "Port Harcourt Central Zone", description: "Port Harcourt city center and port areas" },
          { name: "GRA Zone", description: "Government Residential Area and Woji" },
          { name: "Diobu Zone", description: "Mile 1, Mile 2, and Diobu communities" },
          { name: "Trans Amadi Zone", description: "Trans Amadi Industrial Layout" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Obio Akpor Branch",
        address: "Obio Akpor LGA, Rivers State",
        zones: [
          { name: "Rumuokwuta Zone", description: "Rumuokwuta, Rumuola, and Rumuigbo areas" },
          { name: "Choba Zone", description: "Choba, University of Port Harcourt area" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Delta",
    geopoliticalZone: "South South",
    branches: [
      {
        name: "Warri Branch",
        address: "Warri, Delta State",
        zones: [
          { name: "Warri Central Zone", description: "Warri city center and commercial areas" },
          { name: "Effurun Zone", description: "Effurun, Udu, and industrial areas" },
          { name: "Uvwie Zone", description: "Uvwie, Airport Road, and residential areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      },
      {
        name: "Asaba Branch",
        address: "Asaba, Delta State",
        zones: [
          { name: "Asaba Central Zone", description: "Asaba city center and government house area" },
          { name: "Cable Point Zone", description: "Cable Point, Summit Road, and residential areas" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },

  // NORTH WEST
  {
    name: "Kano",
    geopoliticalZone: "North West",
    branches: [
      {
        name: "Kano Central Branch",
        address: "Kano Municipal, Kano State",
        zones: [
          { name: "Sabon Gari Zone", description: "Sabon Gari and commercial areas" },
          { name: "Fagge Zone", description: "Fagge, Kurmi Market, and traditional areas" },
          { name: "Nasarawa Zone", description: "Nasarawa, BUK area, and educational district" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },
  {
    name: "Kaduna",
    geopoliticalZone: "North West",
    branches: [
      {
        name: "Kaduna North Branch",
        address: "Kaduna North LGA, Kaduna State",
        zones: [
          { name: "Kaduna Central Zone", description: "Kaduna city center and commercial core" },
          { name: "Sabon Tasha Zone", description: "Sabon Tasha, Barnawa, and residential areas" },
          { name: "Tudun Wada Zone", description: "Tudun Wada and traditional communities" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  },

  // NORTH EAST
  {
    name: "Adamawa",
    geopoliticalZone: "North East",
    branches: [
      {
        name: "Yola Branch",
        address: "Yola North LGA, Adamawa State",
        zones: [
          { name: "Yola Central Zone", description: "Yola city center and Emir's palace area" },
          { name: "Jimeta Zone", description: "Jimeta, commercial district, and modern areas" },
          { name: "Modibo Adama Zone", description: "Modibo Adama University area" }
        ],
        totalScore: 0,
        totalInvitedGuests: 0,
        totalCheckedInGuests: 0,
        workersCount: 0,
        status: 'approved',
      }
    ]
  }
];

// Helper function to count totals
export const getHierarchyStats = () => {
  const totalStates = NIGERIA_HIERARCHY_DATA.length;
  const totalBranches = NIGERIA_HIERARCHY_DATA.reduce((acc, state) => acc + state.branches.length, 0);
  const totalZones = NIGERIA_HIERARCHY_DATA.reduce((acc, state) => 
    acc + state.branches.reduce((branchAcc, branch) => branchAcc + branch.zones.length, 0), 0
  );

  return {
    states: totalStates,
    branches: totalBranches,
    zones: totalZones
  };
};

// Helper function to get states by geopolitical zone
export const getStatesByZone = (geopoliticalZone: string) => {
  return NIGERIA_HIERARCHY_DATA.filter(state => state.geopoliticalZone === geopoliticalZone);
};

export const GEOPOLITICAL_ZONES = [
  "North Central",
  "South West", 
  "South East",
  "South South",
  "North West",
  "North East"
];
