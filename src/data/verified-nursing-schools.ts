import type { NursingSchoolOption } from './nursing-schools'

// Hand-verified programs that may be hard to catch through broad federal
// institution imports because of hospital, partner-college, or renamed campuses.
export const verifiedNursingSchoolOptions = [
  {
    id: 'ny-belanger-school-of-nursing',
    name: 'The Belanger School of Nursing',
    aliases: [
      'Belanger School of Nursing',
      'Ellis Medicine Belanger School of Nursing',
      'Ellis Hospital School of Nursing',
      'SUNY Schenectady Belanger School of Nursing',
    ],
    city: 'Schenectady',
    state: 'NY',
    sourceHint: 'ACEN',
    programCodes: ['5138'],
    programTitles: ['Associate in Science Nursing', 'Registered Professional Nurse licensure preparation'],
    website: 'https://www.ellismedicine.org/school-of-nursing/',
  },
] satisfies NursingSchoolOption[]
