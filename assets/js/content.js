/* =====================================================================
   GAVAN GROUP — WEBSITE CONTENT
   ---------------------------------------------------------------------
   વેબસાઇટ અપડેટ કરવા માટે ફક્ત આ ફાઇલ edit કરો.
   Edit ONLY this file to update the website — no coding needed.

   Text can be a plain string, or { en: '...', hi: '...', gu: '...' }
   for English, Hindi and Gujarati. If a language is missing, English
   is shown.
   ===================================================================== */

window.GAVAN = {

  /* ---------- CONTACT ---------- */
  contact: {
    whatsapp: '918200039897',          // country code + number, digits only
    phone: '+91 82000 39897',
    email: 'gavangroup@gmail.com',
    address: { en: 'Vapi, Gujarat', hi: 'वापी, गुजरात', gu: 'વાપી, ગુજરાત' },
    hours: { en: 'Mon – Sat · 10:00 AM – 7:00 PM', hi: 'सोम – शनि · सुबह 10 – शाम 7', gu: 'સોમ – શનિ · સવારે 10 – સાંજે 7' },
    mapQuery: 'Vapi, Gujarat'
  },

  /* ---------- SOCIAL MEDIA ----------
     Follower counts checked on Instagram: 8 Nov 2026 */
  social: [
    { name: 'Vishal Dhola', handle: { en: 'Co-Founder · Personal page', hi: 'को-फाउंडर · पर्सनल पेज', gu: 'કો-ફાઉન્ડર · પર્સનલ પેજ' }, followers: 24600, display: '24.6K', url: 'https://www.instagram.com/_vishal_dhola_' },
    { name: 'VRT — Vishal Realty Talk', handle: { en: 'Real estate knowledge & market talk', hi: 'रियल एस्टेट ज्ञान और मार्केट की बातें', gu: 'રિયલ એસ્ટેટ જ્ઞાન અને માર્કેટ વાતો' }, followers: 10200, display: '10.2K', url: 'https://www.instagram.com/vishalrealtytalk' },
    { name: 'Gavan Group', handle: { en: 'Official page · @gavanhomes', hi: 'ऑफिशियल पेज · @gavanhomes', gu: 'ઓફિશિયલ પેજ · @gavanhomes' }, followers: 4900, display: '4.9K', url: 'https://www.instagram.com/gavanhomes' }
  ],

  /* ---------- PROJECTS ----------
     category: 'residential' | 'commercial' | 'industrial'
               (leave '' if not decided — shows under "All" only)
     location, size, status are optional.
     status: 'Ongoing' | 'Upcoming' | 'Completed' | 'Booking Open'
     logo: optional image path, e.g. 'assets/img/shivaay.jpg'  */
  projects: [
    { name: 'Gavan Homes', location: 'Tithal Road, Valsad', category: 'residential', type: { en: 'Residential', hi: 'रेसिडेंशियल', gu: 'રેસિડેન્શિયલ' } },
    { name: 'Gavan Arena Park', location: 'NH 48 Highway, Vapi', category: 'commercial', type: { en: 'Commercial Hub', hi: 'कमर्शियल हब', gu: 'કોમર્શિયલ હબ' } },
    { name: 'Gavan Vraj Dynasty', location: '', category: '', type: { en: 'Gavan Project', hi: 'गवन प्रोजेक्ट', gu: 'ગવન પ્રોજેક્ટ' } },
    { name: 'Gavan Flow', location: '', category: '', type: { en: 'Gavan Project', hi: 'गवन प्रोजेक्ट', gu: 'ગવન પ્રોજેક્ટ' } },
    { name: 'Gavan Shivaay Industrial Park', logo: 'assets/img/shivaay.jpg', location: 'Ahu · Mamakwada · Anklash', category: 'industrial', type: { en: 'Industrial Plotting', hi: 'इंडस्ट्रियल प्लॉटिंग', gu: 'ઇન્ડસ્ટ્રીયલ પ્લોટિંગ' }, size: { en: '3 locations', hi: '3 लोकेशन', gu: '3 લોકેશન' } }
  ],

  /* ---------- STARTUPS (radiology & medical field) ---------- */
  startups: [
    { name: 'UltraRad AI', logo: 'assets/img/ultrarad.png', tag: { en: 'AI · Radiology', hi: 'AI · रेडियोलॉजी', gu: 'AI · રેડિયોલોજી' },
      text: { en: 'An AI startup built for radiologists — bringing artificial intelligence into everyday radiology work.', hi: 'रेडियोलॉजिस्ट के लिए बना AI स्टार्टअप — रोज़ के रेडियोलॉजी काम में आर्टिफ़िशियल इंटेलिजेंस।', gu: 'રેડિયોલોજિસ્ટ માટેનું AI સ્ટાર્ટઅપ — રોજના રેડિયોલોજી કામમાં આર્ટિફિશિયલ ઇન્ટેલિજન્સ.' },
      url: 'https://www.instagram.com/ultraradai' },
    { name: 'View Box', logo: 'assets/img/viewbox.png', tag: { en: 'Radiology Education', hi: 'रेडियोलॉजी शिक्षा', gu: 'રેડિયોલોજી શિક્ષણ' },
      text: { en: 'A complete education platform for radiologists — learning, practice and growth in one place.', hi: 'रेडियोलॉजिस्ट के लिए संपूर्ण शिक्षा प्लेटफ़ॉर्म — सीखना, अभ्यास और विकास एक ही जगह।', gu: 'રેડિયોલોજિસ્ટ માટેનું સંપૂર્ણ એજ્યુકેશન પ્લેટફોર્મ — શીખવું, પ્રેક્ટિસ અને વિકાસ એક જ જગ્યાએ.' },
      url: '' },
    { name: 'Contrast', logo: 'assets/img/contrast.png', tag: { en: 'Subscription · Education', hi: 'सब्सक्रिप्शन · शिक्षा', gu: 'સબ્સ્ક્રિપ્શન · શિક્ષણ' },
      text: { en: 'A subscription-based learning startup for radiologists — fresh, focused radiology education every month.', hi: 'रेडियोलॉजिस्ट के लिए सब्सक्रिप्शन-आधारित लर्निंग स्टार्टअप — हर महीने नई, केंद्रित रेडियोलॉजी शिक्षा।', gu: 'રેડિયોલોજિસ્ટ માટે સબ્સ્ક્રિપ્શન આધારિત લર્નિંગ સ્ટાર્ટઅપ — દર મહિને નવું, ફોકસ્ડ રેડિયોલોજી શિક્ષણ.' },
      url: 'https://www.instagram.com/contrast.app' }
  ],

  /* ---------- EVENTS & UPDATES ----------
     date: 'YYYY-MM-DD' for a full date, or just 'YYYY' for a year.
     tag: 'Event' | 'Update' | 'Milestone' | 'Foundation' | 'Launch'
     Newest is shown first and highlighted. */
  updates: [
    { date: '2026', tag: 'Event', title: { en: 'CP Meet 2026 — Channel Partner Meet', hi: 'CP मीट 2026 — चैनल पार्टनर मीट', gu: 'CP મીટ 2026 — ચેનલ પાર્ટનર મીટ' },
      text: { en: 'Gavan Group brought its channel partners together for the CP Meet 2026.', hi: 'गवन ग्रुप ने CP मीट 2026 में अपने चैनल पार्टनर्स को एक साथ लाया।', gu: 'ગવન ગ્રુપે CP મીટ 2026માં પોતાના ચેનલ પાર્ટનર્સને એકસાથે ભેગા કર્યા.' } },
    { date: '2025', tag: 'Event', title: { en: 'GGF 2025 — Gavan Grand Fest', hi: 'GGF 2025 — गवन ग्रैंड फेस्ट', gu: 'GGF 2025 — ગવન ગ્રાન્ડ ફેસ્ટ' },
      text: { en: 'The Gavan Grand Fest 2025 celebrated the Gavan family, partners and community.', hi: 'गवन ग्रैंड फेस्ट 2025 में गवन परिवार, पार्टनर्स और कम्युनिटी का उत्सव मनाया गया।', gu: 'ગવન ગ્રાન્ડ ફેસ્ટ 2025માં ગવન પરિવાર, પાર્ટનર્સ અને કોમ્યુનિટીની ઉજવણી થઈ.' } }
  ],

  /* ---------- FUTURE ROADMAP ---------- */
  roadmap: [
    { when: { en: 'Now', hi: 'अभी', gu: 'હાલ' }, title: { en: 'Gavan Radio Centre, Vapi', hi: 'गवन रेडियो सेंटर, वापी', gu: 'ગવન રેડિયો સેન્ટર, વાપી' }, text: { en: 'Launching a modern radiology & diagnostic centre for the region.', hi: 'क्षेत्र के लिए आधुनिक रेडियोलॉजी और डायग्नोस्टिक सेंटर।', gu: 'પ્રદેશ માટે આધુનિક રેડિયોલોજી અને ડાયગ્નોસ્ટિક સેન્ટર.' } },
    { when: { en: 'Next', hi: 'आगे', gu: 'આગળ' }, title: { en: 'Industrial corridor expansion', hi: 'इंडस्ट्रियल कॉरिडोर विस्तार', gu: 'ઇન્ડસ્ટ્રીયલ કોરિડોર વિસ્તાર' }, text: { en: 'More ready-to-build industrial plots along the Vapi–Umargam belt.', hi: 'वापी–उमरगाम बेल्ट में और तैयार इंडस्ट्रियल प्लॉट।', gu: 'વાપી–ઉમરગામ પટ્ટામાં વધુ તૈયાર ઇન્ડસ્ટ્રીયલ પ્લોટ.' } },
    { when: { en: 'Growing', hi: 'विकास', gu: 'વિકાસ' }, title: { en: 'Scaling Gavan startups', hi: 'गवन स्टार्टअप्स का विस्तार', gu: 'ગવન સ્ટાર્ટઅપનો વિસ્તાર' }, text: { en: 'Taking UltraRad AI, View Box and Contrast to radiologists across India.', hi: 'UltraRad AI, View Box और Contrast को पूरे भारत के रेडियोलॉजिस्ट तक पहुँचाना।', gu: 'UltraRad AI, View Box અને Contrastને ભારતભરના રેડિયોલોજિસ્ટ સુધી પહોંચાડવા.' } },
    { when: { en: 'Always', hi: 'हमेशा', gu: 'હંમેશાં' }, title: { en: 'Gavan Foundation', hi: 'गवन फाउंडेशन', gu: 'ગવન ફાઉન્ડેશન' }, text: { en: 'Growing our giving-back as the group grows.', hi: 'ग्रुप के बढ़ने के साथ समाज के लिए योगदान भी बढ़े।', gu: 'ગ્રુપ વધે તેમ સમાજ માટેનું યોગદાન પણ વધે.' } }
  ]
};
