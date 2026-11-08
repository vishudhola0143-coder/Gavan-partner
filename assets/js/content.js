/* =====================================================================
   GAVAN GROUP — WEBSITE CONTENT
   ---------------------------------------------------------------------
   વેબસાઇટ અપડેટ કરવા માટે ફક્ત આ ફાઇલ edit કરો.
   Edit ONLY this file to update the website — no coding needed.

   Text can be a plain string, or { en: '...', gu: '...' } for both
   English and Gujarati. If Gujarati is missing, English is shown.
   ===================================================================== */

window.GAVAN = {

  /* ---------- CONTACT (fill these in) ---------- */
  contact: {
    // WhatsApp number with country code, digits only. e.g. '919800000000'
    // Leave empty and WhatsApp will ask the visitor to pick a chat.
    whatsapp: '',
    phone: '',                 // e.g. '+91 98000 00000'
    email: '',                 // e.g. 'hello@gavangroup.in'
    address: { en: 'Vapi, Valsad District, South Gujarat', gu: 'વાપી, વલસાડ જિલ્લો, દક્ષિણ ગુજરાત' },
    hours: { en: 'Mon – Sat · 10:00 AM – 7:00 PM', gu: 'સોમ – શનિ · સવારે 10 – સાંજે 7' },
    mapQuery: 'Vapi, Gujarat'
  },

  /* ---------- SOCIAL MEDIA ---------- */
  // url: paste the profile link. If empty, the "Follow" button is hidden.
  social: [
    { name: 'Vishal Dhola', handle: { en: 'Founder · Personal page', gu: 'ફાઉન્ડર · પર્સનલ પેજ' }, followers: 24000, display: '24K', url: '' },
    { name: 'VRT — Vishal Realty Talk', handle: { en: 'Real estate knowledge & market talk', gu: 'રિયલ એસ્ટેટ જ્ઞાન અને માર્કેટ વાતો' }, followers: 10500, display: '10K–11K', url: '' },
    { name: 'Gavan Group', handle: { en: 'Official group page', gu: 'ઓફિશિયલ ગ્રુપ પેજ' }, followers: 4900, display: '4.9K', url: '' }
  ],

  /* ---------- PROJECTS ----------
     category: 'residential' | 'commercial' | 'industrial'
     status:   'Ongoing' | 'Upcoming' | 'Completed' | 'Booking Open'  */
  projects: [
    { name: 'Gavan Homes', location: 'Tithal Road, Valsad', category: 'residential', type: { en: 'Luxury Apartments', gu: 'લક્ઝરી એપાર્ટમેન્ટ' }, size: '3.5 Vigha Township', status: 'Ongoing' },
    { name: 'Moksh Villa', location: 'Dharampur Road, Valsad', category: 'residential', type: { en: 'Luxury Bungalows', gu: 'લક્ઝરી બંગલો' }, size: '12 Bungalows · NA Clear', status: 'Ongoing' },
    { name: 'Gavan Arena Park', location: 'NH 48 Highway, Vapi', category: 'commercial', type: { en: 'Commercial Hub', gu: 'કોમર્શિયલ હબ' }, size: '45,000 Sq.Ft', status: 'Booking Open' },
    { name: 'Shivay Industrial Park — Mamakwada', location: 'Vapi–Daman Road', category: 'industrial', type: { en: 'Industrial Plotting', gu: 'ઇન્ડસ્ટ્રીયલ પ્લોટિંગ' }, size: '18 Vigha', status: 'Ongoing' },
    { name: 'Shivay Industrial Park — Ahu', location: 'Ahu Industrial Belt, Umargam', category: 'industrial', type: { en: 'Heavy Industrial Plots', gu: 'હેવી ઇન્ડસ્ટ્રીયલ પ્લોટ' }, size: '25 Vigha', status: 'Ongoing' },
    { name: 'Shivay Industrial Park — Anklash', location: 'Anklash GIDC Bypass, Sanjan', category: 'industrial', type: { en: 'Engineering Zone', gu: 'એન્જિનિયરિંગ ઝોન' }, size: '32 Vigha', status: 'Upcoming' },
    { name: 'Shivay Industrial Park — Umarsadi', location: 'Umarsadi Coastal Road, Pardi', category: 'industrial', type: { en: 'Logistics Park', gu: 'લોજિસ્ટિક્સ પાર્ક' }, size: '40 Vigha', status: 'Upcoming' }
  ],

  /* ---------- STARTUPS ---------- */
  startups: [
    { name: 'Contrast', tag: { en: 'Gavan Startup', gu: 'ગવન સ્ટાર્ટઅપ' }, text: { en: 'A new-age venture from the Gavan ecosystem, built to bring fresh ideas to how South Gujarat lives and works.', gu: 'ગવન ઇકોસિસ્ટમનું નવું વેન્ચર — દક્ષિણ ગુજરાતમાં નવા આઇડિયા લાવવા માટે.' }, url: '' },
    { name: 'View Box', tag: { en: 'Gavan Startup', gu: 'ગવન સ્ટાર્ટઅપ' }, text: { en: 'A creative, visual-first startup that helps people see spaces and ideas clearly before they decide.', gu: 'વિઝ્યુઅલ-ફર્સ્ટ સ્ટાર્ટઅપ — નિર્ણય પહેલાં સ્પેસ અને આઇડિયા સ્પષ્ટ જોવા માટે.' }, url: '' },
    { name: 'Real Estate Solution', tag: { en: 'Gavan Startup', gu: 'ગવન સ્ટાર્ટઅપ' }, text: { en: 'One window for property needs — buying, selling, documentation and guidance, handled with transparency.', gu: 'પ્રોપર્ટીની દરેક જરૂરિયાત માટે એક જ વિન્ડો — ખરીદી, વેચાણ, ડોક્યુમેન્ટેશન અને માર્ગદર્શન.' }, url: '' }
  ],

  /* ---------- EVENTS & UPDATES (newest first) ----------
     tag: 'Event' | 'Update' | 'Milestone' | 'Foundation' | 'Launch' */
  updates: [
    { date: '2026-11-01', tag: 'Milestone', title: { en: 'Gavan Radio Centre, Vapi — work in progress', gu: 'ગવન રેડિયો સેન્ટર, વાપી — કામ ચાલુ' }, text: { en: 'Our upcoming radiology centre in Vapi is taking shape, bringing advanced diagnostic imaging closer to home.', gu: 'વાપીમાં આપણું રેડિયોલોજી સેન્ટર આકાર લઈ રહ્યું છે — આધુનિક ડાયગ્નોસ્ટિક સુવિધા હવે ઘરની નજીક.' } },
    { date: '2026-10-20', tag: 'Update', title: { en: 'Gavan Arena Park — commercial bookings open', gu: 'ગવન એરેના પાર્ક — કોમર્શિયલ બુકિંગ શરૂ' }, text: { en: 'Retail and office spaces on NH 48, Vapi are now open for enquiry.', gu: 'NH 48, વાપી પર રિટેલ અને ઓફિસ સ્પેસ માટે ઇન્ક્વાયરી શરૂ.' } },
    { date: '2026-10-05', tag: 'Foundation', title: { en: 'Gavan Foundation community drive', gu: 'ગવન ફાઉન્ડેશન કોમ્યુનિટી ડ્રાઇવ' }, text: { en: 'Volunteers from across the Gavan family came together for a local community initiative.', gu: 'ગવન પરિવારના સ્વયંસેવકો સ્થાનિક સમાજ સેવા માટે એકઠા થયા.' } },
    { date: '2026-09-15', tag: 'Event', title: { en: 'VRT live session: South Gujarat property outlook', gu: 'VRT લાઈવ સેશન: દક્ષિણ ગુજરાત પ્રોપર્ટી આઉટલૂક' }, text: { en: 'Vishal Dhola talked through where Valsad–Vapi–Umargam real estate is heading.', gu: 'વિશાલ ઢોલાએ વલસાડ–વાપી–ઉમરગામ રિયલ એસ્ટેટની દિશા વિશે વાત કરી.' } }
  ],

  /* ---------- FUTURE ROADMAP ---------- */
  roadmap: [
    { when: { en: 'Now', gu: 'હાલ' }, title: { en: 'Gavan Radio Centre, Vapi', gu: 'ગવન રેડિયો સેન્ટર, વાપી' }, text: { en: 'Launching a modern radiology & diagnostic centre for the region.', gu: 'પ્રદેશ માટે આધુનિક રેડિયોલોજી અને ડાયગ્નોસ્ટિક સેન્ટર.' } },
    { when: { en: 'Next', gu: 'આગળ' }, title: { en: 'Industrial corridor expansion', gu: 'ઇન્ડસ્ટ્રીયલ કોરિડોર વિસ્તાર' }, text: { en: 'More ready-to-build industrial plots along the Vapi–Umargam belt.', gu: 'વાપી–ઉમરગામ પટ્ટામાં વધુ તૈયાર ઇન્ડસ્ટ્રીયલ પ્લોટ.' } },
    { when: { en: 'Growing', gu: 'વિકાસ' }, title: { en: 'Scaling Gavan startups', gu: 'ગવન સ્ટાર્ટઅપનો વિસ્તાર' }, text: { en: 'Taking Contrast, View Box and Real Estate Solution to more people and cities.', gu: 'કોન્ટ્રાસ્ટ, વ્યૂ બોક્સ અને રિયલ એસ્ટેટ સોલ્યુશનને વધુ લોકો સુધી.' } },
    { when: { en: 'Always', gu: 'હંમેશાં' }, title: { en: 'Gavan Foundation', gu: 'ગવન ફાઉન્ડેશન' }, text: { en: 'Growing our giving-back as the group grows.', gu: 'ગ્રુપ વધે તેમ સમાજ માટેનું યોગદાન પણ વધે.' } }
  ]
};
