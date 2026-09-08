(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.FIELD_APP_CONFIG = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PERSONAS = {
    scarlet: { id: 'scarlet', name: 'Miss Scarlet', short: 'Scarlet', color: '#c6404d' },
    peacock: { id: 'peacock', name: 'Mrs. Peacock', short: 'Peacock', color: '#007c91' },
    mustard: { id: 'mustard', name: 'Colonel Mustard', short: 'Mustard', color: '#c69100' },
    plum: { id: 'plum', name: 'Professor Plum', short: 'Plum', color: '#7b4f76' }
  };

  const SITES = [
    {
      id: 'silver-fox', order: 1, name: 'The Silver Fox', theme: 'forest', cipher: { letter: 'D', number: 4 },
      challenges: {
        scarlet: { prompt: 'Between Parking Lot 5 and Parking Lot 4, how many greens lie between them?', capture: 'Greens between parking lots', type: 'number', expected: 2, engine: v => String(v) },
        peacock: { prompt: 'Find evidence showing how many holes comprise The Silver Fox course.', capture: 'Number of holes', type: 'number', expected: 18, engine: v => `${v} holes` },
        mustard: { prompt: 'Which other hole’s green is closest to the #1 tee box?', capture: 'Closest other green', type: 'number', expected: 9, engine: v => `Green ${v}` },
        plum: { prompt: 'Find the wooden Hole 1 yardage sign. Convert its 294 feet to yards.', capture: 'Hole 1 distance in yards', type: 'number', expected: 98, engine: v => `${v} yards` }
      }
    },
    {
      id: 'heg', order: 2, name: 'Colonel Heg Memorial Park', theme: 'heritage', cipher: { letter: 'G', number: 1 },
      challenges: {
        scarlet: { prompt: 'On Colonel Hans Christian Heg’s pedestal, record the place identified after “BORN IN.”', capture: 'Birthplace', type: 'text', expected: ['LIER', 'LIER NORWAY', 'LIER, NORWAY'], engine: v => String(v).toUpperCase() },
        peacock: { prompt: 'Ignore the inscription and study the statue. What two objects is Heg holding?', capture: 'Objects held', type: 'keywords', expected: ['hat', 'sword'], engine: v => String(v).toUpperCase() },
        mustard: { prompt: 'At what battle did Colonel Heg fall?', capture: 'Battle', type: 'text', expected: ['CHICKAMAUGA'], engine: v => String(v).toUpperCase() },
        plum: { prompt: 'What was Heg’s Wisconsin regiment number?', capture: 'Regiment number', type: 'number', expected: 15, engine: v => String(v) }
      }
    },
    {
      id: 'kopps', order: 3, name: 'Kopp’s Frozen Custard', theme: 'custard', cipher: { letter: 'B', number: 6 },
      challenges: {
        scarlet: { prompt: 'Using aerial reconnaissance, count the visible cow shadows at the Cow Row location.', capture: 'Visible cow shadows', type: 'number', expected: 19, engine: v => `${v} shadows` },
        peacock: { prompt: 'Count the benches in the Greenfield waterfall area.', capture: 'Waterfall-area benches', type: 'number', expected: 8, engine: v => `${v} benches` },
        mustard: { prompt: 'Analyze service flow. Record the number of custard registers, pickup colors, and fountain/sandwich registers.', capture: 'Service-flow counts', type: 'triple', fields: ['Custard registers', 'Pickup colors', 'Fountain / sandwich registers'], expected: [3,4,5], engine: v => Array.isArray(v) ? v.join(' · ') : String(v) },
        plum: { prompt: 'Count the benches outside the waterfall area at Greenfield.', capture: 'Non-waterfall benches', type: 'number', expected: 8, engine: v => `${v} benches` }
      },
      synthesis: {
        kind: 'kopps', title: 'Team Convergence',
        prompt: 'Peacock + Plum produce one value. Scarlet combines her shadow count with Mustard’s ordered service counts to produce the other. Enter the absolute difference.',
        expected: 1, label: 'Team result'
      }
    },
    {
      id: 'big-putts', order: 4, name: 'Big Putts', theme: 'putts', cipher: { letter: 'F', number: 3 }, backup: 'Grafton distance: 17 miles.',
      challenges: {
        scarlet: { prompt: 'Near the fire extinguisher by the Jurassic Park Jeep, what Illinois route number is shown?', capture: 'Illinois route number', type: 'number', expected: 83, engine: v => `IL ${v}` },
        peacock: { prompt: 'What number is on the license plate that begins with DHS?', capture: 'DHS plate number', type: 'number', expected: 93, engine: v => `DHS · ${v}` },
        mustard: { prompt: 'Find the weight-class sign between the tractor and railroad-crossing signs. The class is a letter. What is that letter’s numerical position in the alphabet?', capture: 'Alphabet position', type: 'number', expected: 2, engine: v => `B → ${v}` },
        plum: { prompt: 'What number is on the Wyoming plate that ends in 277W?', capture: 'Wyoming plate number', type: 'number', expected: 4, engine: v => `WY · ${v}` }
      }
    },
    {
      id: 'lake-vista', order: 5, name: 'Lake Vista Park', theme: 'lake', cipher: { letter: 'A', number: 7 },
      challenges: {
        scarlet: { prompt: 'Using signage around the park, identify the name the builder gave to the tall brick tower.', capture: 'Builder’s tower name', type: 'text', expected: ['BEACON'], engine: v => String(v).toUpperCase() },
        peacock: { prompt: 'Count the park’s two shelter types: sail shelters and bluff / overlook shelters.', capture: 'Shelter counts', type: 'pair', fields: ['Sail shelters', 'Bluff / overlook shelters'], expected: [3,2], engine: v => Array.isArray(v) ? `${v[0]} sail · ${v[1]} bluff` : String(v) },
        mustard: { prompt: 'What full-size navigational structure is the tall brick beacon intended to reference?', capture: 'Referenced structure', type: 'text', expected: ['LIGHTHOUSE'], engine: v => String(v).toUpperCase() },
        plum: { prompt: 'The right-hand digit of Heg’s Wisconsin regiment gives your minimum target. Identify at least that many separate accessibility-friendly features of the park. You may record more.', capture: 'Accessibility-friendly features', type: 'list', minItems: 5, maxItems: 10, engine: v => `${Array.isArray(v) ? v.filter(Boolean).length : 0} features` }
      }
    },
    {
      id: 'wind-point', order: 6, name: 'Wind Point Lighthouse', theme: 'lighthouse', cipher: { letter: 'E', number: 2 },
      challenges: {
        scarlet: { prompt: 'Use the main historical marker to determine the year the lighthouse began functioning.', capture: 'Year functioning began', type: 'number', expected: 1880, engine: v => String(v) },
        peacock: { prompt: 'Find the roundest shoreline rock you can and estimate its diameter in inches.', capture: 'Estimated diameter in inches', type: 'positiveNumber', engine: v => `≈ ${v} in` },
        mustard: { prompt: 'Find the Fuel House sign. Record two ways the building’s design or use reduced the danger of storing flammable lamp oil.', capture: 'Safety design choices', type: 'twoText', fields: ['Safety choice 1', 'Safety choice 2'], engine: v => Array.isArray(v) ? v.join(' / ') : String(v) },
        plum: { prompt: 'How many miles farther could the light be seen than the fog horns could be heard?', capture: 'Range difference', type: 'number', expected: 9, engine: v => `${v} miles` }
      }
    },
    {
      id: 'dunes', order: 7, name: 'Kenosha Sand Dunes', theme: 'dunes', cipher: { letter: 'C', number: 5 },
      challenges: {
        scarlet: { prompt: 'Working with Plum, find one example of non-insect animal life—or evidence of it—in the open sand, wetland / swale, or shore environment. Your example must differ from Plum’s.', capture: 'Animal-life evidence', type: 'textAny', engine: v => String(v) },
        peacock: { prompt: 'Working with Mustard, find vegetation that visibly helps stabilize loose dune sand. Record what you observed.', capture: 'Stabilized-dune evidence', type: 'textAny', engine: v => String(v) },
        mustard: { prompt: 'Working with Peacock, find the transition into the more mature tree / woodland community. Record what you observed.', capture: 'Woodland evidence', type: 'textAny', engine: v => String(v) },
        plum: { prompt: 'Working with Scarlet, find a second, different example of non-insect animal life—or evidence of it—in the open sand, wetland / swale, or shore environment.', capture: 'Different animal-life evidence', type: 'textAny', engine: v => String(v) }
      },
      synthesis: {
        kind: 'dunes', title: 'Team Convergence',
        prompt: 'Confirm that Scarlet and Plum recovered different animal evidence. Then identify the earlier and later vegetation stages observed by Peacock and Mustard.',
        expected: { differentAnimals: true, earlier: 'peacock', later: 'mustard' }
      }
    }
  ];

  return {
    version: 'FieldDossier v3 · 2026-09-08',
    title: 'The Jewel of the Lochs',
    subtitle: 'Field Dossier',
    defaultSessionId: 'JOTL-2026-FIELD',
    engineWindowMs: 20000,
    personas: PERSONAS,
    personaOrder: ['scarlet','peacock','mustard','plum'],
    sites: SITES
  };
});
