export interface LocalPresenceResult {
  areaCode: string
  city: string
  state: string
  metro: string
  callerIdPhone: string
  callerIdFormatted: string
  isExactMatch: boolean
}

// Major US & Canadian Area Code Directory
export const AREA_CODE_DIRECTORY: Record<string, { city: string; state: string; metro: string }> = {
  // California
  '213': { city: 'Los Angeles', state: 'CA', metro: 'Downtown LA' },
  '310': { city: 'Los Angeles', state: 'CA', metro: 'West LA / Santa Monica / Beverly Hills' },
  '323': { city: 'Los Angeles', state: 'CA', metro: 'Central LA / Hollywood' },
  '415': { city: 'San Francisco', state: 'CA', metro: 'San Francisco Bay Area' },
  '408': { city: 'San Jose', state: 'CA', metro: 'Silicon Valley' },
  '650': { city: 'Palo Alto', state: 'CA', metro: 'San Mateo / Peninsula' },
  '510': { city: 'Oakland', state: 'CA', metro: 'East Bay' },
  '619': { city: 'San Diego', state: 'CA', metro: 'San Diego Metro' },
  '858': { city: 'La Jolla', state: 'CA', metro: 'North County San Diego' },
  '714': { city: 'Anaheim', state: 'CA', metro: 'Orange County' },
  '949': { city: 'Irvine', state: 'CA', metro: 'South Orange County / Newport' },
  '916': { city: 'Sacramento', state: 'CA', metro: 'Sacramento Metro' },

  // New York
  '212': { city: 'New York', state: 'NY', metro: 'Manhattan' },
  '646': { city: 'New York', state: 'NY', metro: 'Manhattan' },
  '718': { city: 'Brooklyn / Queens', state: 'NY', metro: 'NYC Outer Boroughs' },
  '917': { city: 'New York', state: 'NY', metro: 'NYC Metro' },
  '516': { city: 'Hempstead', state: 'NY', metro: 'Long Island' },
  '914': { city: 'White Plains', state: 'NY', metro: 'Westchester County' },

  // Texas
  '512': { city: 'Austin', state: 'TX', metro: 'Austin Metro' },
  '737': { city: 'Austin', state: 'TX', metro: 'Austin Metro' },
  '214': { city: 'Dallas', state: 'TX', metro: 'Dallas Metro' },
  '972': { city: 'Dallas', state: 'TX', metro: 'North Dallas / Plano' },
  '469': { city: 'Dallas', state: 'TX', metro: 'DFW Metroplex' },
  '713': { city: 'Houston', state: 'TX', metro: 'Houston Metro' },
  '281': { city: 'Houston', state: 'TX', metro: 'Greater Houston' },
  '210': { city: 'San Antonio', state: 'TX', metro: 'San Antonio Metro' },

  // Florida
  '305': { city: 'Miami', state: 'FL', metro: 'Miami-Dade' },
  '786': { city: 'Miami', state: 'FL', metro: 'Miami / Coral Gables' },
  '954': { city: 'Fort Lauderdale', state: 'FL', metro: 'Broward County' },
  '561': { city: 'West Palm Beach', state: 'FL', metro: 'Palm Beach' },
  '407': { city: 'Orlando', state: 'FL', metro: 'Central Florida' },
  '813': { city: 'Tampa', state: 'FL', metro: 'Tampa Bay' },

  // Washington & Oregon
  '206': { city: 'Seattle', state: 'WA', metro: 'Seattle Metro' },
  '425': { city: 'Bellevue', state: 'WA', metro: 'Eastside / Kirkland' },
  '503': { city: 'Portland', state: 'OR', metro: 'Portland Metro' },

  // Illinois
  '312': { city: 'Chicago', state: 'IL', metro: 'Downtown Chicago' },
  '773': { city: 'Chicago', state: 'IL', metro: 'Chicago Metro' },

  // Nevada & Arizona
  '702': { city: 'Las Vegas', state: 'NV', metro: 'Las Vegas Valley' },
  '775': { city: 'Reno', state: 'NV', metro: 'Northern Nevada' },
  '602': { city: 'Phoenix', state: 'AZ', metro: 'Phoenix Metro' },
  '480': { city: 'Scottsdale', state: 'AZ', metro: 'Scottsdale / East Valley' },

  // Colorado & Utah
  '303': { city: 'Denver', state: 'CO', metro: 'Denver Metro' },
  '720': { city: 'Denver / Boulder', state: 'CO', metro: 'Front Range' },
  '801': { city: 'Salt Lake City', state: 'UT', metro: 'Wasatch Front' },

  // Massachusetts & Georgia
  '617': { city: 'Boston', state: 'MA', metro: 'Greater Boston' },
  '404': { city: 'Atlanta', state: 'GA', metro: 'Atlanta Metro' },
  '678': { city: 'Atlanta', state: 'GA', metro: 'Atlanta Suburbs' },
}

// Format Phone Number string Helper
export const formatPhoneNumber = (digits: string): string => {
  const clean = digits.replace(/\D/g, '')
  if (clean.length === 10) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`
  }
  if (clean.length === 11 && clean.startsWith('1')) {
    return `+1 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`
  }
  return digits
}

/**
 * Match Local Presence Caller ID based on Target Phone Number
 */
export const matchLocalPresence = (
  targetPhone: string,
  _brokerageId?: string
): LocalPresenceResult => {
  const digits = targetPhone.replace(/\D/g, '')
  let areaCode = ''

  if (digits.length === 10) {
    areaCode = digits.slice(0, 3)
  } else if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.slice(1, 4)
  } else if (digits.length >= 3) {
    areaCode = digits.slice(0, 3)
  } else {
    areaCode = '310' // Default fallback
  }

  const region = AREA_CODE_DIRECTORY[areaCode] || {
    city: 'Local Territory',
    state: 'US',
    metro: 'Regional Presence',
  }

  // Realistic exchange prefix calculation (400-899 range)
  const exchange = 400 + (parseInt(areaCode, 10) % 500)
  const line = 2000 + (parseInt(digits.slice(-4) || '1234', 10) % 7000)

  const callerIdPhone = `+1${areaCode}${exchange}${line}`
  const callerIdFormatted = `+1 (${areaCode}) ${exchange}-${line}`

  return {
    areaCode,
    city: region.city,
    state: region.state,
    metro: region.metro,
    callerIdPhone,
    callerIdFormatted,
    isExactMatch: Boolean(AREA_CODE_DIRECTORY[areaCode]),
  }
}
