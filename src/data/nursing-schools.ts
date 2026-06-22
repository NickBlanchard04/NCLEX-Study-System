import { generatedNursingSchoolOptions } from './generated-nursing-schools'
import { verifiedNursingSchoolOptions } from './verified-nursing-schools'

export interface NursingSchoolOption {
  id: string
  scorecardId?: number
  name: string
  city: string
  state: string
  sourceHint: 'CCNE' | 'ACEN' | 'State board' | 'IPEDS/College Scorecard' | 'College Scorecard Nursing CIP'
  aliases?: string[]
  programCodes?: string[]
  programTitles?: string[]
  website?: string
}

// Starter directory for the profile picker. Keep this data module separate so a
// full CCNE/ACEN/NCSBN/IPEDS import can replace it without changing the UI.
export const starterNursingSchoolOptions: NursingSchoolOption[] = [
  { id: 'al-uab', name: 'University of Alabama at Birmingham School of Nursing', city: 'Birmingham', state: 'AL', sourceHint: 'CCNE' },
  { id: 'al-south-alabama', name: 'University of South Alabama College of Nursing', city: 'Mobile', state: 'AL', sourceHint: 'CCNE' },
  { id: 'az-asu', name: 'Arizona State University Edson College of Nursing and Health Innovation', city: 'Phoenix', state: 'AZ', sourceHint: 'CCNE' },
  { id: 'az-arizona', name: 'University of Arizona College of Nursing', city: 'Tucson', state: 'AZ', sourceHint: 'CCNE' },
  { id: 'ar-uams', name: 'University of Arkansas for Medical Sciences College of Nursing', city: 'Little Rock', state: 'AR', sourceHint: 'CCNE' },
  { id: 'ca-ucla', name: 'UCLA School of Nursing', city: 'Los Angeles', state: 'CA', sourceHint: 'CCNE' },
  { id: 'ca-ucsf', name: 'UCSF School of Nursing', city: 'San Francisco', state: 'CA', sourceHint: 'CCNE' },
  { id: 'ca-csulb', name: 'California State University Long Beach School of Nursing', city: 'Long Beach', state: 'CA', sourceHint: 'CCNE' },
  { id: 'ca-sdsu', name: 'San Diego State University School of Nursing', city: 'San Diego', state: 'CA', sourceHint: 'CCNE' },
  { id: 'co-cu-anschutz', name: 'University of Colorado College of Nursing', city: 'Aurora', state: 'CO', sourceHint: 'CCNE' },
  { id: 'ct-uconn', name: 'University of Connecticut School of Nursing', city: 'Storrs', state: 'CT', sourceHint: 'CCNE' },
  { id: 'de-udel', name: 'University of Delaware School of Nursing', city: 'Newark', state: 'DE', sourceHint: 'CCNE' },
  { id: 'dc-georgetown', name: 'Georgetown University School of Nursing', city: 'Washington', state: 'DC', sourceHint: 'CCNE' },
  { id: 'dc-cua', name: 'Catholic University of America Conway School of Nursing', city: 'Washington', state: 'DC', sourceHint: 'CCNE' },
  { id: 'fl-uf', name: 'University of Florida College of Nursing', city: 'Gainesville', state: 'FL', sourceHint: 'CCNE' },
  { id: 'fl-fsu', name: 'Florida State University College of Nursing', city: 'Tallahassee', state: 'FL', sourceHint: 'CCNE' },
  { id: 'fl-miami', name: 'University of Miami School of Nursing and Health Studies', city: 'Coral Gables', state: 'FL', sourceHint: 'CCNE' },
  { id: 'ga-emory', name: 'Emory University Nell Hodgson Woodruff School of Nursing', city: 'Atlanta', state: 'GA', sourceHint: 'CCNE' },
  { id: 'ga-gsu', name: 'Georgia State University Byrdine F. Lewis College of Nursing and Health Professions', city: 'Atlanta', state: 'GA', sourceHint: 'CCNE' },
  { id: 'hi-uh-manoa', name: 'University of Hawaii at Manoa Nancy Atmospera-Walch School of Nursing', city: 'Honolulu', state: 'HI', sourceHint: 'CCNE' },
  { id: 'id-boise', name: 'Boise State University School of Nursing', city: 'Boise', state: 'ID', sourceHint: 'CCNE' },
  { id: 'il-uic', name: 'University of Illinois Chicago College of Nursing', city: 'Chicago', state: 'IL', sourceHint: 'CCNE' },
  { id: 'il-rush', name: 'Rush University College of Nursing', city: 'Chicago', state: 'IL', sourceHint: 'CCNE' },
  { id: 'in-iu', name: 'Indiana University School of Nursing', city: 'Indianapolis', state: 'IN', sourceHint: 'CCNE' },
  { id: 'ia-uiowa', name: 'University of Iowa College of Nursing', city: 'Iowa City', state: 'IA', sourceHint: 'CCNE' },
  { id: 'ks-ku', name: 'University of Kansas School of Nursing', city: 'Kansas City', state: 'KS', sourceHint: 'CCNE' },
  { id: 'ky-uk', name: 'University of Kentucky College of Nursing', city: 'Lexington', state: 'KY', sourceHint: 'CCNE' },
  { id: 'la-lsu', name: 'LSU Health New Orleans School of Nursing', city: 'New Orleans', state: 'LA', sourceHint: 'CCNE' },
  { id: 'me-umaine', name: 'University of Maine School of Nursing', city: 'Orono', state: 'ME', sourceHint: 'CCNE' },
  { id: 'md-umaryland', name: 'University of Maryland School of Nursing', city: 'Baltimore', state: 'MD', sourceHint: 'CCNE' },
  { id: 'ma-bc', name: 'Boston College Connell School of Nursing', city: 'Chestnut Hill', state: 'MA', sourceHint: 'CCNE' },
  { id: 'ma-umass', name: 'University of Massachusetts Amherst Elaine Marieb College of Nursing', city: 'Amherst', state: 'MA', sourceHint: 'CCNE' },
  { id: 'mi-umich', name: 'University of Michigan School of Nursing', city: 'Ann Arbor', state: 'MI', sourceHint: 'CCNE' },
  { id: 'mi-msu', name: 'Michigan State University College of Nursing', city: 'East Lansing', state: 'MI', sourceHint: 'CCNE' },
  { id: 'mn-umn', name: 'University of Minnesota School of Nursing', city: 'Minneapolis', state: 'MN', sourceHint: 'CCNE' },
  { id: 'ms-umc', name: 'University of Mississippi Medical Center School of Nursing', city: 'Jackson', state: 'MS', sourceHint: 'CCNE' },
  { id: 'mo-slu', name: 'Saint Louis University Trudy Busch Valentine School of Nursing', city: 'St. Louis', state: 'MO', sourceHint: 'CCNE' },
  { id: 'mo-mu', name: 'University of Missouri Sinclair School of Nursing', city: 'Columbia', state: 'MO', sourceHint: 'CCNE' },
  { id: 'mt-msu', name: 'Montana State University Mark and Robyn Jones College of Nursing', city: 'Bozeman', state: 'MT', sourceHint: 'CCNE' },
  { id: 'ne-unmc', name: 'University of Nebraska Medical Center College of Nursing', city: 'Omaha', state: 'NE', sourceHint: 'CCNE' },
  { id: 'nv-unlv', name: 'UNLV School of Nursing', city: 'Las Vegas', state: 'NV', sourceHint: 'CCNE' },
  { id: 'nh-unh', name: 'University of New Hampshire Department of Nursing', city: 'Durham', state: 'NH', sourceHint: 'CCNE' },
  { id: 'nj-rutgers', name: 'Rutgers School of Nursing', city: 'Newark', state: 'NJ', sourceHint: 'CCNE' },
  { id: 'nm-unm', name: 'University of New Mexico College of Nursing', city: 'Albuquerque', state: 'NM', sourceHint: 'CCNE' },
  { id: 'ny-columbia', name: 'Columbia University School of Nursing', city: 'New York', state: 'NY', sourceHint: 'CCNE' },
  { id: 'ny-maria-college', name: 'Maria College', city: 'Albany', state: 'NY', sourceHint: 'IPEDS/College Scorecard' },
  { id: 'ny-nyu', name: 'NYU Rory Meyers College of Nursing', city: 'New York', state: 'NY', sourceHint: 'CCNE' },
  { id: 'ny-stony-brook', name: 'Stony Brook University School of Nursing', city: 'Stony Brook', state: 'NY', sourceHint: 'CCNE' },
  { id: 'nc-duke', name: 'Duke University School of Nursing', city: 'Durham', state: 'NC', sourceHint: 'CCNE' },
  { id: 'nc-unc', name: 'UNC School of Nursing', city: 'Chapel Hill', state: 'NC', sourceHint: 'CCNE' },
  { id: 'nd-und', name: 'University of North Dakota College of Nursing and Professional Disciplines', city: 'Grand Forks', state: 'ND', sourceHint: 'CCNE' },
  { id: 'oh-osu', name: 'The Ohio State University College of Nursing', city: 'Columbus', state: 'OH', sourceHint: 'CCNE' },
  { id: 'oh-case', name: 'Case Western Reserve University Frances Payne Bolton School of Nursing', city: 'Cleveland', state: 'OH', sourceHint: 'CCNE' },
  { id: 'ok-ou', name: 'University of Oklahoma Fran and Earl Ziegler College of Nursing', city: 'Oklahoma City', state: 'OK', sourceHint: 'CCNE' },
  { id: 'or-ohsu', name: 'Oregon Health & Science University School of Nursing', city: 'Portland', state: 'OR', sourceHint: 'CCNE' },
  { id: 'pa-upenn', name: 'University of Pennsylvania School of Nursing', city: 'Philadelphia', state: 'PA', sourceHint: 'CCNE' },
  { id: 'pa-pitt', name: 'University of Pittsburgh School of Nursing', city: 'Pittsburgh', state: 'PA', sourceHint: 'CCNE' },
  { id: 'ri-uri', name: 'University of Rhode Island College of Nursing', city: 'Kingston', state: 'RI', sourceHint: 'CCNE' },
  { id: 'sc-musc', name: 'Medical University of South Carolina College of Nursing', city: 'Charleston', state: 'SC', sourceHint: 'CCNE' },
  { id: 'sd-sdsu', name: 'South Dakota State University College of Nursing', city: 'Brookings', state: 'SD', sourceHint: 'CCNE' },
  { id: 'tn-vanderbilt', name: 'Vanderbilt University School of Nursing', city: 'Nashville', state: 'TN', sourceHint: 'CCNE' },
  { id: 'tn-uthsc', name: 'University of Tennessee Health Science Center College of Nursing', city: 'Memphis', state: 'TN', sourceHint: 'CCNE' },
  { id: 'tx-ut-austin', name: 'The University of Texas at Austin School of Nursing', city: 'Austin', state: 'TX', sourceHint: 'CCNE' },
  { id: 'tx-ut-health-houston', name: 'Cizik School of Nursing at UTHealth Houston', city: 'Houston', state: 'TX', sourceHint: 'CCNE' },
  { id: 'tx-baylor', name: 'Baylor University Louise Herrington School of Nursing', city: 'Dallas', state: 'TX', sourceHint: 'CCNE' },
  { id: 'ut-utah', name: 'University of Utah College of Nursing', city: 'Salt Lake City', state: 'UT', sourceHint: 'CCNE' },
  { id: 'vt-uvm', name: 'University of Vermont Department of Nursing', city: 'Burlington', state: 'VT', sourceHint: 'CCNE' },
  { id: 'va-uva', name: 'University of Virginia School of Nursing', city: 'Charlottesville', state: 'VA', sourceHint: 'CCNE' },
  { id: 'va-vcu', name: 'VCU School of Nursing', city: 'Richmond', state: 'VA', sourceHint: 'CCNE' },
  { id: 'wa-uw', name: 'University of Washington School of Nursing', city: 'Seattle', state: 'WA', sourceHint: 'CCNE' },
  { id: 'wa-wsu', name: 'Washington State University College of Nursing', city: 'Spokane', state: 'WA', sourceHint: 'CCNE' },
  { id: 'wv-wvu', name: 'West Virginia University School of Nursing', city: 'Morgantown', state: 'WV', sourceHint: 'CCNE' },
  { id: 'wi-uw-madison', name: 'University of Wisconsin-Madison School of Nursing', city: 'Madison', state: 'WI', sourceHint: 'CCNE' },
  { id: 'wi-marquette', name: 'Marquette University College of Nursing', city: 'Milwaukee', state: 'WI', sourceHint: 'CCNE' },
  { id: 'wy-uwyo', name: 'University of Wyoming Fay W. Whitney School of Nursing', city: 'Laramie', state: 'WY', sourceHint: 'CCNE' },
  { id: 'pr-upr', name: 'University of Puerto Rico Medical Sciences Campus School of Nursing', city: 'San Juan', state: 'PR', sourceHint: 'CCNE' },
]

const normalizeSchoolKey = (school: NursingSchoolOption) =>
  `${school.name}|${school.city}|${school.state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function dedupeSchools(schools: NursingSchoolOption[]) {
  const directory = new Map<string, NursingSchoolOption>()
  for (const school of schools) {
    const key = normalizeSchoolKey(school)
    const existing = directory.get(key)
    if (!existing) {
      directory.set(key, school)
      continue
    }

    directory.set(key, {
      ...school,
      ...existing,
      programCodes: Array.from(new Set([...(existing.programCodes ?? []), ...(school.programCodes ?? [])])),
      programTitles: Array.from(new Set([...(existing.programTitles ?? []), ...(school.programTitles ?? [])])),
      website: existing.website ?? school.website,
      scorecardId: existing.scorecardId ?? school.scorecardId,
    })
  }
  return Array.from(directory.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const nursingSchoolOptions: NursingSchoolOption[] = dedupeSchools([
  ...starterNursingSchoolOptions,
  ...verifiedNursingSchoolOptions,
  ...generatedNursingSchoolOptions,
])

export const formatNursingSchoolOption = (school: NursingSchoolOption) =>
  `${school.name} (${school.city}, ${school.state})`

export function searchNursingSchools(query: string, limit = 12) {
  const normalized = query.trim().toLowerCase()
  const schools = normalized
    ? nursingSchoolOptions
        .map((school) => {
          const aliases = school.aliases?.join(' ') ?? ''
          const haystack = `${school.name} ${aliases} ${school.city} ${school.state} ${school.programTitles?.join(' ') ?? ''}`.toLowerCase()
          const startsWith = [school.name, ...(school.aliases ?? [])].some((value) =>
            value.toLowerCase().startsWith(normalized),
          )
          const includes = haystack.includes(normalized)
          return { school, rank: startsWith ? 0 : includes ? 1 : 2 }
        })
        .filter((entry) => entry.rank < 2)
        .sort((a, b) => a.rank - b.rank || a.school.name.localeCompare(b.school.name))
        .map((entry) => entry.school)
    : nursingSchoolOptions

  return schools.slice(0, limit)
}
