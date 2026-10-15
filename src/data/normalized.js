import iso from './iso-codes.json' with { type: 'json' };
import seed from './countries.seed.json' with { type: 'json' };
import { scholarships as raw } from '../data.js';
import catalog from '../../deadlines.json' with { type: 'json' };
import { buildCountries, normalizeScholarship } from '../lib/normalize.js';

// Europe-wide discovery is kept as a regional collection rather than assigned to a fictitious country.
export const countries = [...buildCountries(iso, seed), {
  code: 'EU', name: 'Europe · multi-country routes', flag: '🇪🇺', requirements: {}, confidence: 'unrated',
  note: 'A regional funding directory. Immigration and spouse rights depend on the actual host countries; no EU-wide residence entitlement is implied.'
}];
const coverage = {
  commonwealth:'full', kaust:'full', mbzuai:'full', weidenfeld:'full', clarendon:'full', gates:'full',
  khs:'full', chevening:'full', ediss:'full', 'commonwealth-shared':'full', mext:'full',
  stipendium:'partial', turkiye:'full', gks:'full', 'daad-master':'partial', 'eth-esop':'full',
  'mext-university':'full', 'goi-ies':'full', eiffel:'partial', 'si-sweden':'full', 'erasmus-ai':'full'
};
export const scholarships = raw.map(item => {
  const exact = catalog.deadlines.find(d => d.scholarship_id === item.id);
  const dateOnly = catalog.date_only?.find(d => d.scholarship_id === item.id);
  const countryCode = item.id === 'ediss' ? 'FI' : item.id === 'erasmus-ai' ? 'EU' : undefined;
  const normalized = normalizeScholarship(item, iso, { slug:'id', name:'name', provider:'provider', country:'country', funding:'funding', deadline:'deadline', url:'source' });
  return { ...normalized, countryCode:countryCode || normalized.countryCode, _unmappedCountry:undefined,
    funding:coverage[item.id], fundingNote:item.funding,
    funding_source_url:item.source, funding_verified_on:item.verifiedOn || '2026-09-28',
    fundingConditional:!['kaust','mext','mext-university'].includes(item.id),
    url:item.source, countryCodes:item.id === 'ediss' ? ['FI','ES','IT','SE'] : [countryCode || normalized.countryCode],
    spouse:item.id==='kaust'?{level:'met',reason:'KAUST offers family apartments for married students with dependants, subject to availability and an additional fee outside the fellowship.',source:'https://admissions.kaust.edu.sa/about-kaust/student-accomodation',verified_on:'2026-10-15'}:undefined,
    mobilityNote:item.id === 'ediss' ? 'First year in Finland; second-year routes in Spain, Italy or Sweden. Rights depend on your selected route.' : '',
    deadlineAt:exact?.deadline_at ?? null, deadlineTz:exact?.deadline_tz ?? null,
    deadline_source_url:exact?.source_url ?? null, deadline_verified_on:exact?.verified_on ?? null,
    deadlinePrecision:exact ? 'exact' : 'date_only', deadlineDate:dateOnly?.deadline_date || item.deadline || null
  };
});
