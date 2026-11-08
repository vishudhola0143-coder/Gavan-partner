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
    { name: 'Vishal Dhola', ig: '_vishal_dhola_', logo: 'assets/img/people/vishal-dhola.jpg',
      handle: { en: 'Co-Founder · builder, creating homes and a legacy of trust', hi: 'को-फाउंडर · घर और भरोसे की विरासत बनाने वाले बिल्डर', gu: 'કો-ફાઉન્ડર · ઘર અને ભરોસાનો વારસો બનાવતા બિલ્ડર' },
      followers: 24600, display: '24.6K', url: 'https://www.instagram.com/_vishal_dhola_' },
    { name: 'UltraRad AI', ig: 'ultraradai', logo: 'assets/img/ultrarad.png',
      handle: { en: 'Revolutionising radiodiagnosis with AI — 224 posts of radiology learning', hi: 'AI से रेडियोडायग्नोसिस में क्रांति — रेडियोलॉजी सीखने के 224 पोस्ट', gu: 'AI થી રેડિયોડાયગ્નોસિસમાં ક્રાંતિ — રેડિયોલોજી શીખવાના 224 પોસ્ટ' },
      followers: 28100, display: '28.1K', url: 'https://www.instagram.com/ultraradai' },
    { name: 'VRT — Vishal Realty Talk', ig: 'vishalrealtytalk', initials: 'VRT',
      handle: { en: 'Real estate, simplified — South Gujarat market insights before you invest', hi: 'रियल एस्टेट आसान भाषा में — निवेश से पहले दक्षिण गुजरात की मार्केट जानकारी', gu: 'રિયલ એસ્ટેટ સરળ ભાષામાં — રોકાણ પહેલાં દક્ષિણ ગુજરાતની માર્કેટ સમજ' },
      followers: 10200, display: '10.2K', url: 'https://www.instagram.com/vishalrealtytalk' },
    { name: 'Gavan Group', ig: 'gavanhomes', logo: 'assets/img/gavan-mark.png',
      handle: { en: 'Leading real estate company in Vapi — bungalows, flats & shops', hi: 'वापी की अग्रणी रियल एस्टेट कंपनी — बंगले, फ्लैट और दुकानें', gu: 'વાપીની અગ્રણી રિયલ એસ્ટેટ કંપની — બંગલો, ફ્લેટ અને દુકાનો' },
      followers: 4900, display: '4.9K', url: 'https://www.instagram.com/gavanhomes' },
    { name: 'Shivaay Industrial Park', ig: 'shivaay_industrialpark', logo: 'assets/img/shivaay.jpg',
      handle: { en: 'Industrial parks in South Gujarat — by Shivaay Developers & Gavan', hi: 'दक्षिण गुजरात में इंडस्ट्रियल पार्क — शिवाय डेवलपर्स और गवन द्वारा', gu: 'દક્ષિણ ગુજરાતમાં ઇન્ડસ્ટ્રીયલ પાર્ક — શિવાય ડેવલપર્સ અને ગવન દ્વારા' },
      followers: 68, display: '68', url: 'https://www.instagram.com/shivaay_industrialpark' },
    { name: 'The Viewbox', ig: 'theviewbox.in', logo: 'assets/img/viewbox.png',
      handle: { en: 'Your whole radiology training in one place — theviewbox.in', hi: 'आपकी पूरी रेडियोलॉजी ट्रेनिंग एक ही जगह — theviewbox.in', gu: 'તમારી આખી રેડિયોલોજી ટ્રેનિંગ એક જ જગ્યાએ — theviewbox.in' },
      followers: 90, display: '90', url: 'https://www.instagram.com/theviewbox.in' },
    { name: 'Contrast App', ig: 'contrast.app', logo: 'assets/img/contrast.png',
      handle: { en: 'The next-gen radiology education platform', hi: 'नेक्स्ट-जेन रेडियोलॉजी एजुकेशन प्लेटफ़ॉर्म', gu: 'નેક્સ્ટ-જેન રેડિયોલોજી એજ્યુકેશન પ્લેટફોર્મ' },
      followers: 44, display: '44', url: 'https://www.instagram.com/contrast.app' }
  ],

  /* ---------- PROJECTS ----------
     category: 'residential' | 'commercial' | 'industrial'  (or a list, e.g. ['residential', 'commercial'])
               (leave '' if not decided — shows under "All" only)
     location, size, status are optional.
     status: 'Ongoing' | 'Upcoming' | 'Completed' | 'Booking Open'
     logo: optional image path, e.g. 'assets/img/shivaay.jpg'
     gallery + galleryPath: photos (first photo = card cover)
     featured: true -> shown as the big showcase above the project list  */
  projects: [
    { name: 'Gavan Homes', location: '', category: ['residential', 'commercial'], featured: true,
      type: { en: 'Apartments, Row Houses & Shops', hi: 'अपार्टमेंट, रो हाउस और दुकानें', gu: 'એપાર્ટમેન્ટ, રો હાઉસ અને દુકાનો' },
      tagline: { en: 'A complete address — a mid-rise apartment tower with ground-floor retail on the main road, a lane of contemporary row houses, a clubhouse and a rooftop garden.',
                 hi: 'एक संपूर्ण पता — मेन रोड पर ग्राउंड फ्लोर दुकानों के साथ अपार्टमेंट टावर, आधुनिक रो हाउस, क्लबहाउस और रूफटॉप गार्डन।',
                 gu: 'એક સંપૂર્ણ સરનામું — મેઇન રોડ પર ગ્રાઉન્ડ ફ્લોર દુકાનો સાથે એપાર્ટમેન્ટ ટાવર, આધુનિક રો હાઉસ, ક્લબહાઉસ અને રૂફટોપ ગાર્ડન.' },
      amenities: [
        { en: 'Grand entrance porch', hi: 'भव्य एंट्रेंस पोर्च', gu: 'ભવ્ય એન્ટ્રન્સ પોર્ચ' },
        { en: 'Ground-floor retail shops', hi: 'ग्राउंड फ्लोर रिटेल दुकानें', gu: 'ગ્રાઉન્ડ ફ્લોર રિટેલ દુકાનો' },
        { en: 'Apartments & row houses', hi: 'अपार्टमेंट और रो हाउस', gu: 'એપાર્ટમેન્ટ અને રો હાઉસ' },
        { en: 'Clubhouse', hi: 'क्लबहाउस', gu: 'ક્લબહાઉસ' },
        { en: 'Rooftop garden', hi: 'रूफटॉप गार्डन', gu: 'રૂફટોપ ગાર્ડન' },
        { en: "Kids' play area", hi: 'बच्चों का प्ले एरिया', gu: 'બાળકો માટે પ્લે એરિયા' },
        { en: 'Landscaped walkways', hi: 'लैंडस्केप वॉकवे', gu: 'લેન્ડસ્કેપ વૉકવે' },
        { en: 'Main-road frontage', hi: 'मेन रोड फ्रंटेज', gu: 'મેઇન રોડ ફ્રન્ટેજ' }
      ],
      galleryPath: 'assets/img/homes/',
      gallery: [
        { src: '01-tower.jpg', cap: { en: 'Gavan Homes', hi: 'गवन होम्स', gu: 'ગવન હોમ્સ' } },
        { src: '02-entrance.jpg', cap: { en: 'Entrance at dusk', hi: 'शाम को प्रवेश द्वार', gu: 'સાંજે પ્રવેશદ્વાર' } },
        { src: '03-aerial-view.jpg', cap: { en: 'Aerial view — tower & row houses', hi: 'एरियल व्यू — टावर और रो हाउस', gu: 'એરિયલ વ્યૂ — ટાવર અને રો હાઉસ' } },
        { src: '04-tower-corner.jpg', cap: { en: 'Main-road frontage', hi: 'मेन रोड फ्रंटेज', gu: 'મેઇન રોડ ફ્રન્ટેજ' } },
        { src: '05-tower-dusk.jpg', cap: { en: 'Apartments & shops at dusk', hi: 'शाम को अपार्टमेंट और दुकानें', gu: 'સાંજે એપાર્ટમેન્ટ અને દુકાનો' } },
        { src: '06-retail-shops.jpg', cap: { en: 'Ground-floor retail shops', hi: 'ग्राउंड फ्लोर रिटेल दुकानें', gu: 'ગ્રાઉન્ડ ફ્લોર રિટેલ દુકાનો' } },
        { src: '07-row-houses.jpg', cap: { en: 'Row houses', hi: 'रो हाउस', gu: 'રો હાઉસ' } },
        { src: '08-row-house-street.jpg', cap: { en: 'Row house street', hi: 'रो हाउस की गली', gu: 'રો હાઉસની શેરી' } },
        { src: '09-row-houses-dusk.jpg', cap: { en: 'Row houses at dusk', hi: 'शाम को रो हाउस', gu: 'સાંજે રો હાઉસ' } },
        { src: '10-entry-porch.jpg', cap: { en: 'Entry porch', hi: 'एंट्री पोर्च', gu: 'એન્ટ્રી પોર્ચ' } },
        { src: '11-rooftop-garden.jpg', cap: { en: 'Rooftop garden', hi: 'रूफटॉप गार्डन', gu: 'રૂફટોપ ગાર્ડન' } },
        { src: '12-clubhouse.jpg', cap: { en: 'Clubhouse', hi: 'क्लबहाउस', gu: 'ક્લબહાઉસ' } },
        { src: '13-kids-play.jpg', cap: { en: 'Kids\' play area', hi: 'बच्चों का प्ले एरिया', gu: 'બાળકો માટે પ્લે એરિયા' } }
      ] },
    { name: 'Gavan Arena Park', location: 'Vapi', category: 'residential', featured: true,
      type: { en: 'Premium Row Houses', hi: 'प्रीमियम रो हाउस', gu: 'પ્રીમિયમ રો હાઉસ' },
      tagline: { en: 'A gated community of contemporary row houses — with a clubhouse, landscaped lawns, gazebo lounges and a kids\' play area.',
                 hi: 'आधुनिक रो हाउस की गेटेड कम्युनिटी — क्लबहाउस, हरे-भरे लॉन, गज़ेबो लाउंज और बच्चों के खेलने की जगह के साथ।',
                 gu: 'આધુનિક રો હાઉસની ગેટેડ કોમ્યુનિટી — ક્લબહાઉસ, લીલાછમ લૉન, ગઝેબો લાઉન્જ અને બાળકો માટે પ્લે એરિયા સાથે.' },
      amenities: [
        { en: 'Grand entrance gate', hi: 'भव्य प्रवेश द्वार', gu: 'ભવ્ય એન્ટ્રન્સ ગેટ' },
        { en: 'Clubhouse', hi: 'क्लबहाउस', gu: 'ક્લબહાઉસ' },
        { en: 'Central lawn', hi: 'सेंट्रल लॉन', gu: 'સેન્ટ્રલ લૉન' },
        { en: 'Gazebo lounge', hi: 'गज़ेबो लाउंज', gu: 'ગઝેબો લાઉન્જ' },
        { en: 'Sit-out decks', hi: 'सिट-आउट डेक', gu: 'સિટ-આઉટ ડેક' },
        { en: "Kids' play area", hi: 'बच्चों का प्ले एरिया', gu: 'બાળકો માટે પ્લે એરિયા' },
        { en: 'Private balconies', hi: 'निजी बालकनी', gu: 'પ્રાઇવેટ બાલ્કની' },
        { en: 'Tree-lined internal roads', hi: 'पेड़ों से सजी अंदरूनी सड़कें', gu: 'વૃક્ષોથી સજ્જ આંતરિક રસ્તા' }
      ],
      galleryPath: 'assets/img/arena/',
      gallery: [
        { src: '01-entrance.jpg', cap: { en: 'Main entrance', hi: 'मुख्य प्रवेश द्वार', gu: 'મુખ્ય પ્રવેશદ્વાર' } },
        { src: '02-facade.jpg', cap: { en: 'Row house façade', hi: 'रो हाउस का फ़्रंट', gu: 'રો હાઉસનો ફ્રન્ટ' } },
        { src: '03-row-houses-dusk.jpg', cap: { en: 'Row houses at dusk', hi: 'शाम के समय रो हाउस', gu: 'સાંજના સમયે રો હાઉસ' } },
        { src: '04-street.jpg', cap: { en: 'Tree-lined streets', hi: 'पेड़ों से सजी गलियाँ', gu: 'વૃક્ષોથી સજ્જ શેરીઓ' } },
        { src: '05-internal-road.jpg', cap: { en: 'Internal roads', hi: 'अंदरूनी सड़कें', gu: 'આંતરિક રસ્તા' } },
        { src: '06-balcony.jpg', cap: { en: 'Private balcony', hi: 'निजी बालकनी', gu: 'પ્રાઇવેટ બાલ્કની' } },
        { src: '07-clubhouse-entrance.jpg', cap: { en: 'Clubhouse entrance', hi: 'क्लबहाउस प्रवेश', gu: 'ક્લબહાઉસ એન્ટ્રન્સ' } },
        { src: '08-clubhouse.jpg', cap: { en: 'Clubhouse', hi: 'क्लबहाउस', gu: 'ક્લબહાઉસ' } },
        { src: '09-central-lawn.jpg', cap: { en: 'Central lawn', hi: 'सेंट्रल लॉन', gu: 'સેન્ટ્રલ લૉન' } },
        { src: '10-garden-gazebo.jpg', cap: { en: 'Garden & gazebo', hi: 'गार्डन और गज़ेबो', gu: 'ગાર્ડન અને ગઝેબો' } },
        { src: '11-gazebo-lounge.jpg', cap: { en: 'Gazebo lounge', hi: 'गज़ेबो लाउंज', gu: 'ગઝેબો લાઉન્જ' } },
        { src: '12-sit-out-deck.jpg', cap: { en: 'Sit-out deck', hi: 'सिट-आउट डेक', gu: 'સિટ-આઉટ ડેક' } },
        { src: '13-kids-play.jpg', cap: { en: "Kids' play area", hi: 'बच्चों का प्ले एरिया', gu: 'બાળકો માટે પ્લે એરિયા' } },
        { src: '14-entrance-dusk.jpg', cap: { en: 'Entrance at dusk', hi: 'शाम को प्रवेश द्वार', gu: 'સાંજે પ્રવેશદ્વાર' } }
      ] },
    { name: 'Gavan Vraj Dynasty', location: '', category: 'residential', featured: true,
      type: { en: 'Classic Row Houses', hi: 'क्लासिक रो हाउस', gu: 'ક્લાસિક રો હાઉસ' },
      tagline: { en: 'A gated community of classic, European-style row houses — arched façades, private terraces, a temple, a clubhouse and tree-lined streets.',
                 hi: 'क्लासिक यूरोपियन-स्टाइल रो हाउस की गेटेड कम्युनिटी — आर्च वाले फ़्रंट, निजी टेरेस, मंदिर, क्लबहाउस और पेड़ों से सजी गलियाँ।',
                 gu: 'ક્લાસિક યુરોપિયન-સ્ટાઇલ રો હાઉસની ગેટેડ કોમ્યુનિટી — કમાનવાળા ફ્રન્ટ, પ્રાઇવેટ ટેરેસ, મંદિર, ક્લબહાઉસ અને વૃક્ષોથી સજ્જ શેરીઓ.' },
      amenities: [
        { en: 'Grand entrance gate', hi: 'भव्य प्रवेश द्वार', gu: 'ભવ્ય એન્ટ્રન્સ ગેટ' },
        { en: 'Security cabin', hi: 'सिक्योरिटी केबिन', gu: 'સિક્યોરિટી કેબિન' },
        { en: 'Temple', hi: 'मंदिर', gu: 'મંદિર' },
        { en: 'Clubhouse', hi: 'क्लबहाउस', gu: 'ક્લબહાઉસ' },
        { en: 'Landscaped garden', hi: 'लैंडस्केप गार्डन', gu: 'લેન્ડસ્કેપ ગાર્ડન' },
        { en: 'Private terraces & balconies', hi: 'निजी टेरेस और बालकनी', gu: 'પ્રાઇવેટ ટેરેસ અને બાલ્કની' },
        { en: 'Parking at every home', hi: 'हर घर में पार्किंग', gu: 'દરેક ઘરમાં પાર્કિંગ' },
        { en: 'Tree-lined internal roads', hi: 'पेड़ों से सजी अंदरूनी सड़कें', gu: 'વૃક્ષોથી સજ્જ આંતરિક રસ્તા' }
      ],
      galleryPath: 'assets/img/vraj/',
      gallery: [
        { src: '01-entrance-gate.jpg', cap: { en: 'Entrance gate', hi: 'प्रवेश द्वार', gu: 'પ્રવેશદ્વાર' } },
        { src: '02-facade-dusk.jpg', cap: { en: 'Row houses at dusk', hi: 'शाम को रो हाउस', gu: 'સાંજે રો હાઉસ' } },
        { src: '03-aerial-view.jpg', cap: { en: 'Aerial view', hi: 'एरियल व्यू', gu: 'એરિયલ વ્યૂ' } },
        { src: '04-temple-garden.jpg', cap: { en: 'Temple & garden', hi: 'मंदिर और गार्डन', gu: 'મંદિર અને ગાર્ડન' } },
        { src: '05-street-view.jpg', cap: { en: 'Street view', hi: 'स्ट्रीट व्यू', gu: 'સ્ટ્રીટ વ્યૂ' } },
        { src: '06-top-view.jpg', cap: { en: 'Terraces & balconies', hi: 'टेरेस और बालकनी', gu: 'ટેરેસ અને બાલ્કની' } },
        { src: '07-clubhouse.jpg', cap: { en: 'Clubhouse', hi: 'क्लबहाउस', gu: 'ક્લબહાઉસ' } },
        { src: '08-balcony.jpg', cap: { en: 'Balcony view', hi: 'बालकनी व्यू', gu: 'બાલ્કની વ્યૂ' } }
      ] },
    { name: 'Gavan Flow', location: '', category: 'residential', featured: true,
      type: { en: 'Luxury High-Rise Residences', hi: 'लग्ज़री हाई-राइज़ रेसिडेंस', gu: 'લક્ઝરી હાઇ-રાઇઝ રેસિડેન્સ' },
      tagline: { en: 'A landmark high-rise with sculpted, flowing balconies wrapped in greenery — luxury living with a grand glass entrance lobby.',
                 hi: 'हरियाली से सजी लहरदार बालकनियों वाला एक लैंडमार्क हाई-राइज़ — भव्य ग्लास एंट्रेंस लॉबी के साथ लग्ज़री जीवन।',
                 gu: 'હરિયાળીથી સજ્જ લહેરાતી બાલ્કનીઓ સાથેનો લેન્ડમાર્ક હાઇ-રાઇઝ — ભવ્ય ગ્લાસ એન્ટ્રન્સ લોબી સાથે લક્ઝરી જીવન.' },
      amenities: [
        { en: 'Iconic flowing façade', hi: 'आइकॉनिक लहरदार फ़्रंट', gu: 'આઇકોનિક લહેરાતો ફ્રન્ટ' },
        { en: 'Wrap-around balconies', hi: 'चारों ओर बालकनी', gu: 'ચારે બાજુ બાલ્કની' },
        { en: 'Green planters on every floor', hi: 'हर मंज़िल पर हरियाली', gu: 'દરેક માળ પર હરિયાળી' },
        { en: 'Grand glass entrance lobby', hi: 'भव्य ग्लास एंट्रेंस लॉबी', gu: 'ભવ્ય ગ્લાસ એન્ટ્રન્સ લોબી' },
        { en: 'Rooftop greens', hi: 'रूफटॉप हरियाली', gu: 'રૂફટોપ હરિયાળી' },
        { en: 'Landscaped entrance', hi: 'लैंडस्केप एंट्रेंस', gu: 'લેન્ડસ્કેપ એન્ટ્રન્સ' }
      ],
      galleryPath: 'assets/img/flow/',
      gallery: [
        { src: '01-tower.jpg', cap: { en: 'Gavan Flow tower', hi: 'गवन फ्लो टावर', gu: 'ગવન ફ્લો ટાવર' } },
        { src: '02-entrance.jpg', cap: { en: 'Entrance & signage', hi: 'प्रवेश और साइनेज', gu: 'પ્રવેશ અને સાઇનેજ' } },
        { src: '03-tower-dusk.jpg', cap: { en: 'Tower at dusk', hi: 'शाम को टावर', gu: 'સાંજે ટાવર' } },
        { src: '04-flowing-balconies.jpg', cap: { en: 'Flowing balconies', hi: 'लहरदार बालकनी', gu: 'લહેરાતી બાલ્કની' } }
      ] },
    { name: 'Gavan Shivaay Industrial Park', logo: 'assets/img/shivaay.jpg', location: 'Ahu · Mamakwada · Anklash', category: 'industrial', featured: true,
      type: { en: 'Industrial Plotting', hi: 'इंडस्ट्रियल प्लॉटिंग', gu: 'ઇન્ડસ્ટ્રીયલ પ્લોટિંગ' }, size: { en: '3 locations', hi: '3 लोकेशन', gu: '3 લોકેશન' },
      tagline: { en: 'Master-planned industrial parks across three South Gujarat locations — with a landmark entrance plaza, an admin building, wide internal roads and ready plots.',
                 hi: 'दक्षिण गुजरात की तीन लोकेशन पर मास्टर-प्लान्ड इंडस्ट्रियल पार्क — भव्य प्रवेश प्लाज़ा, एडमिन बिल्डिंग, चौड़ी अंदरूनी सड़कें और तैयार प्लॉट।',
                 gu: 'દક્ષિણ ગુજરાતના ત્રણ લોકેશન પર માસ્ટર-પ્લાન્ડ ઇન્ડસ્ટ્રીયલ પાર્ક — ભવ્ય પ્રવેશ પ્લાઝા, એડમિન બિલ્ડિંગ, પહોળા આંતરિક રસ્તા અને તૈયાર પ્લોટ.' },
      amenities: [
        { en: 'Landmark entrance plaza', hi: 'भव्य प्रवेश प्लाज़ा', gu: 'ભવ્ય પ્રવેશ પ્લાઝા' },
        { en: 'Admin / office building', hi: 'एडमिन / ऑफिस बिल्डिंग', gu: 'એડમિન / ઓફિસ બિલ્ડિંગ' },
        { en: 'Master-planned plot layout', hi: 'मास्टर-प्लान्ड प्लॉट लेआउट', gu: 'માસ્ટર-પ્લાન્ડ પ્લોટ લેઆઉટ' },
        { en: 'Wide internal roads', hi: 'चौड़ी अंदरूनी सड़कें', gu: 'પહોળા આંતરિક રસ્તા' },
        { en: 'Landscaped greens & water bodies', hi: 'हरियाली और जल-स्रोत', gu: 'હરિયાળી અને જળાશય' },
        { en: 'Visitor parking', hi: 'विज़िटर पार्किंग', gu: 'વિઝિટર પાર્કિંગ' },
        { en: 'Ahu · Mamakwada · Anklash', hi: 'आहु · मामकवाडा · अंकलाश', gu: 'આહુ · મામકવાડા · અંકલાશ' }
      ],
      galleryPath: 'assets/img/shivaay/',
      gallery: [
        { src: '01-entrance-plaza.jpg', cap: { en: 'Entrance plaza', hi: 'प्रवेश प्लाज़ा', gu: 'પ્રવેશ પ્લાઝા' } },
        { src: '02-gavan-shivaay-signage.jpg', cap: { en: 'Gavan | Shivaay signage', hi: 'गवन | शिवाय साइनेज', gu: 'ગવન | શિવાય સાઇનેજ' } },
        { src: '03-entrance-admin.jpg', cap: { en: 'Entrance & admin building', hi: 'प्रवेश और एडमिन बिल्डिंग', gu: 'પ્રવેશ અને એડમિન બિલ્ડિંગ' } },
        { src: '04-master-plan.jpg', cap: { en: 'Master plan — plot layout', hi: 'मास्टर प्लान — प्लॉट लेआउट', gu: 'માસ્ટર પ્લાન — પ્લોટ લેઆઉટ' } },
        { src: '05-admin-building.jpg', cap: { en: 'Admin building', hi: 'एडमिन बिल्डिंग', gu: 'એડમિન બિલ્ડિંગ' } },
        { src: '06-admin-sunset.jpg', cap: { en: 'Admin building at sunset', hi: 'सूर्यास्त में एडमिन बिल्डिंग', gu: 'સૂર્યાસ્ત સમયે એડમિન બિલ્ડિંગ' } },
        { src: '07-parking.jpg', cap: { en: 'Visitor parking', hi: 'विज़िटर पार्किंग', gu: 'વિઝિટર પાર્કિંગ' } },
        { src: '08-landscaped-drive.jpg', cap: { en: 'Landscaped driveway', hi: 'लैंडस्केप ड्राइववे', gu: 'લેન્ડસ્કેપ ડ્રાઇવવે' } }
      ] }
  ],

  /* ---------- STARTUPS (radiology & medical field) ---------- */
  startups: [
    { name: 'UltraRad AI', logo: 'assets/img/ultrarad.png', followers: '28.1K', tag: { en: 'AI · Radiology', hi: 'AI · रेडियोलॉजी', gu: 'AI · રેડિયોલોજી' },
      text: { en: 'Revolutionising radiodiagnosis with AI. A 28K+ community of radiologists learning chest, MSK, female pelvis, KUB & GU and more through visual, case-based posts.',
              hi: 'AI से रेडियोडायग्नोसिस में क्रांति। 28K+ रेडियोलॉजिस्ट की कम्युनिटी — चेस्ट, MSK, फ़ीमेल पेल्विस, KUB और GU जैसे विषय विज़ुअल, केस-आधारित पोस्ट से।',
              gu: 'AI થી રેડિયોડાયગ્નોસિસમાં ક્રાંતિ. 28K+ રેડિયોલોજિસ્ટની કોમ્યુનિટી — ચેસ્ટ, MSK, ફીમેલ પેલ્વિસ, KUB અને GU જેવા વિષયો વિઝ્યુઅલ, કેસ-આધારિત પોસ્ટથી.' },
      url: 'https://www.instagram.com/ultraradai' },
    { name: 'The Viewbox', logo: 'assets/img/viewbox.png', followers: '90', tag: { en: 'Radiology Training · Web & Android', hi: 'रेडियोलॉजी ट्रेनिंग · वेब और एंड्रॉइड', gu: 'રેડિયોલોજી ટ્રેનિંગ · વેબ અને એન્ડ્રોઇડ' },
      text: { en: 'Your whole radiology training in one place — 1,400 FRCR MCQs, 340 OSCE stations, daily spotters, timed mocks and an interactive Anatomy Atlas. Used in 178 countries.',
              hi: 'आपकी पूरी रेडियोलॉजी ट्रेनिंग एक ही जगह — 1,400 FRCR MCQ, 340 OSCE स्टेशन, डेली स्पॉटर, टाइम्ड मॉक और इंटरैक्टिव एनाटॉमी एटलस। 178 देशों में उपयोग।',
              gu: 'તમારી આખી રેડિયોલોજી ટ્રેનિંગ એક જ જગ્યાએ — 1,400 FRCR MCQ, 340 OSCE સ્ટેશન, ડેઇલી સ્પોટર, ટાઇમ્ડ મૉક અને ઇન્ટરેક્ટિવ એનાટોમી એટલાસ. 178 દેશોમાં ઉપયોગ.' },
      url: 'https://www.instagram.com/theviewbox.in', site: 'https://theviewbox.in' },
    { name: 'Contrast App', logo: 'assets/img/contrast.png', followers: '44', tag: { en: 'Subscription · Education', hi: 'सब्सक्रिप्शन · शिक्षा', gu: 'સબ્સ્ક્રિપ્શન · શિક્ષણ' },
      text: { en: 'The next-gen radiology education platform — subscription-based learning for radiologists. Now hiring content writers and radiology faculty.',
              hi: 'नेक्स्ट-जेन रेडियोलॉजी एजुकेशन प्लेटफ़ॉर्म — रेडियोलॉजिस्ट के लिए सब्सक्रिप्शन-आधारित लर्निंग। अभी कंटेंट राइटर और रेडियोलॉजी फ़ैकल्टी की भर्ती चल रही है।',
              gu: 'નેક્સ્ટ-જેન રેડિયોલોજી એજ્યુકેશન પ્લેટફોર્મ — રેડિયોલોજિસ્ટ માટે સબ્સ્ક્રિપ્શન આધારિત લર્નિંગ. અત્યારે કન્ટેન્ટ રાઇટર અને રેડિયોલોજી ફેકલ્ટીની ભરતી ચાલુ છે.' },
      url: 'https://www.instagram.com/contrast.app' }
  ],

  /* ---------- EVENTS & UPDATES ----------
     date: 'YYYY-MM-DD' for a full date, or just 'YYYY' for a year.
     tag: 'Event' | 'Update' | 'Milestone' | 'Foundation' | 'Launch'
     Keep the newest at the TOP of this list — it is shown first and highlighted. */
  updates: [
    { date: '2026', tag: 'Event', name: 'Pre-Diwali 2026',
      title: { en: 'Pre-Diwali 2026 — Staff Celebration & Welfare', hi: 'प्री-दिवाली 2026 — स्टाफ सेलिब्रेशन और वेलफ़ेयर', gu: 'પ્રી-દિવાળી 2026 — સ્ટાફ સેલિબ્રેશન અને વેલફેર' },
      text: { en: 'The whole Gavan family — team members and their families — came together before Diwali for a staff programme with Diwali gifts, appreciation for every member, garba and celebration. Our people are our biggest strength.',
              hi: 'दिवाली से पहले पूरा गवन परिवार — टीम के सदस्य और उनके परिवार — स्टाफ प्रोग्राम के लिए एक साथ आए: दिवाली उपहार, हर सदस्य की सराहना, गरबा और जश्न। हमारे लोग ही हमारी सबसे बड़ी ताक़त हैं।',
              gu: 'દિવાળી પહેલાં આખો ગવન પરિવાર — ટીમના સભ્યો અને તેમના પરિવાર — સ્ટાફ પ્રોગ્રામ માટે એકસાથે ભેગા થયા: દિવાળીની ભેટ, દરેક સભ્યની કદર, ગરબા અને ઉજવણી. આપણા લોકો જ આપણી સૌથી મોટી તાકાત છે.' },
      galleryPath: 'assets/img/diwali/',
      gallery: [
        { src: '01-diwali.jpg', cap: { en: "The Gavan family — Pre-Diwali 2026", hi: "गवन परिवार — प्री-दिवाली 2026", gu: "ગવન પરિવાર — પ્રી-દિવાળી 2026" } },
        { src: '02-diwali.jpg', cap: { en: "Leadership on stage", hi: "मंच पर नेतृत्व", gu: "સ્ટેજ પર નેતૃત્વ" } },
        { src: '03-diwali.jpg', cap: { en: "Diwali gifts for the team", hi: "टीम के लिए दिवाली उपहार", gu: "ટીમ માટે દિવાળી ભેટ" } },
        { src: '04-diwali.jpg', cap: { en: "Thank you for a great year", hi: "शानदार साल के लिए धन्यवाद", gu: "શાનદાર વર્ષ માટે આભાર" } },
        { src: '05-diwali.jpg', cap: { en: "Staff welfare — gifts for every member", hi: "स्टाफ वेलफ़ेयर — हर सदस्य को उपहार", gu: "સ્ટાફ વેલફેર — દરેક સભ્યને ભેટ" } },
        { src: '06-diwali.jpg', cap: { en: "Appreciating our people", hi: "अपने लोगों की सराहना", gu: "આપણા લોકોની કદર" } },
        { src: '07-diwali.jpg', cap: { en: "Team celebrating together", hi: "साथ मिलकर जश्न मनाती टीम", gu: "સાથે મળીને ઉજવણી કરતી ટીમ" } },
        { src: '08-diwali.jpg', cap: { en: "Families joined the celebration", hi: "परिवार भी जश्न में शामिल हुए", gu: "પરિવારો પણ ઉજવણીમાં જોડાયા" } },
        { src: '09-diwali.jpg', cap: { en: "Garba & dance", hi: "गरबा और डांस", gu: "ગરબા અને ડાન્સ" } },
        { src: '10-diwali.jpg', cap: { en: "Gifts and smiles", hi: "उपहार और मुस्कान", gu: "ભેટ અને સ્મિત" } }
      ] },
    { date: '2026-10-27', tag: 'Event', name: 'CPLP 2026', where: 'Fortune Park Galaxy, Vapi',
      title: { en: 'CP Meet 2026 — Channel Partner Legacy Program (CPLP)', hi: 'CP मीट 2026 — चैनल पार्टनर लेगेसी प्रोग्राम (CPLP)', gu: 'CP મીટ 2026 — ચેનલ પાર્ટનર લેગસી પ્રોગ્રામ (CPLP)' },
      text: { en: 'Held at Fortune Park Galaxy, Vapi and presented by The Coastal Era — Gavan and Shivaay brought hundreds of channel partners together to share the vision for South Gujarat\'s coastal industrial corridor, felicitate partners and celebrate the legacy ahead.',
              hi: 'द कोस्टल एरा द्वारा प्रस्तुत — गवन और शिवाय ने सैकड़ों चैनल पार्टनर्स को एक साथ लाकर दक्षिण गुजरात के तटीय इंडस्ट्रियल कॉरिडोर का विज़न साझा किया, पार्टनर्स का सम्मान किया और आगे की विरासत का जश्न मनाया।',
              gu: 'ધ કોસ્ટલ એરા દ્વારા પ્રસ્તુત — ગવન અને શિવાયે સેંકડો ચેનલ પાર્ટનર્સને એકસાથે ભેગા કરીને દક્ષિણ ગુજરાતના દરિયાકાંઠાના ઇન્ડસ્ટ્રીયલ કોરિડોરનું વિઝન રજૂ કર્યું, પાર્ટનર્સનું સન્માન કર્યું અને આગળની સફરની ઉજવણી કરી.' },
      galleryPath: 'assets/img/cpmeet/',
      gallery: [
        { src: '01-venue.jpg', cap: { en: "CPLP 2026 venue", hi: "CPLP 2026 वेन्यू", gu: "CPLP 2026 વેન્યુ" } },
        { src: '02-registration.jpg', cap: { en: "Partner registration", hi: "पार्टनर रजिस्ट्रेशन", gu: "પાર્ટનર રજિસ્ટ્રેશન" } },
        { src: '03-keynote-coast.jpg', cap: { en: "Keynote: South Gujarat's coast — the next industrial address", hi: "कीनोट: दक्षिण गुजरात का तट — अगला इंडस्ट्रियल पता", gu: "કીનોટ: દક્ષિણ ગુજરાતનો દરિયાકાંઠો — આગામી ઇન્ડસ્ટ્રીયલ સરનામું" } },
        { src: '04-audience.jpg', cap: { en: "A full house of channel partners", hi: "चैनल पार्टनर्स से भरा हॉल", gu: "ચેનલ પાર્ટનર્સથી ભરેલો હૉલ" } },
        { src: '05-partners-move-first.jpg', cap: { en: "\"The partners who move first, win.\"", hi: "\"जो पार्टनर पहले कदम उठाते हैं, वही जीतते हैं।\"", gu: "\"જે પાર્ટનર પહેલું પગલું ભરે, એ જ જીતે.\"" } },
        { src: '06-team.jpg', cap: { en: "The people behind the industrial parks", hi: "इंडस्ट्रियल पार्क के पीछे की टीम", gu: "ઇન્ડસ્ટ્રીયલ પાર્ક પાછળની ટીમ" } },
        { src: '07-audience-cheer.jpg', cap: { en: "Partners cheering", hi: "उत्साहित पार्टनर्स", gu: "ઉત્સાહિત પાર્ટનર્સ" } },
        { src: '08-partners-on-stage.jpg', cap: { en: "Partners on stage — 500 acres vision", hi: "मंच पर पार्टनर्स — 500 एकड़ विज़न", gu: "સ્ટેજ પર પાર્ટનર્સ — 500 એકર વિઝન" } },
        { src: '09-celebration.jpg', cap: { en: "Celebrating together", hi: "साथ मिलकर जश्न", gu: "સાથે મળીને ઉજવણી" } },
        { src: '10-cake-cutting.jpg', cap: { en: "Cake cutting", hi: "केक कटिंग", gu: "કેક કટિંગ" } }
      ] },
    { date: '2025', tag: 'Event', title: { en: 'GGF 2025 — Gavan Grand Fest', hi: 'GGF 2025 — गवन ग्रैंड फेस्ट', gu: 'GGF 2025 — ગવન ગ્રાન્ડ ફેસ્ટ' },
      text: { en: 'The Gavan Grand Fest 2025 celebrated the Gavan family, partners and community.', hi: 'गवन ग्रैंड फेस्ट 2025 में गवन परिवार, पार्टनर्स और कम्युनिटी का उत्सव मनाया गया।', gu: 'ગવન ગ્રાન્ડ ફેસ્ટ 2025માં ગવન પરિવાર, પાર્ટનર્સ અને કોમ્યુનિટીની ઉજવણી થઈ.' } }
  ],

  /* ---------- GAVAN INTERIO — portfolio (first photo = big tile) ---------- */
  interio: {
    name: 'Gavan Interio',
    galleryPath: 'assets/img/interio/',
    gallery: [
      { src: '01-interior.jpg', cap: { en: "Master bedroom — lit bed & jaali wall", hi: "मास्टर बेडरूम — लाइटिंग बेड और जाली वॉल", gu: "માસ્ટર બેડરૂમ — લાઇટિંગ બેડ અને જાળી વૉલ" } },
      { src: '02-interior.jpg', cap: { en: "Living room — wooden-slat ceiling", hi: "लिविंग रूम — वुडन स्लैट सीलिंग", gu: "લિવિંગ રૂમ — વુડન સ્લેટ સીલિંગ" } },
      { src: '03-interior.jpg', cap: { en: "Marble feature door & cove lighting", hi: "मार्बल फ़ीचर डोर और कोव लाइटिंग", gu: "માર્બલ ફીચર ડોર અને કોવ લાઇટિંગ" } },
      { src: '04-interior.jpg', cap: { en: "Bedroom with full-height wardrobe", hi: "फुल-हाइट वॉर्डरोब के साथ बेडरूम", gu: "ફુલ-હાઇટ વૉર્ડરોબ સાથે બેડરૂમ" } },
      { src: '05-interior.jpg', cap: { en: "Upholstered headboard & textured wall", hi: "अपहोल्स्टर्ड हेडबोर्ड और टेक्सचर वॉल", gu: "અપહોલ્સ્ટર્ડ હેડબોર્ડ અને ટેક્સચર વૉલ" } },
      { src: '06-interior.jpg', cap: { en: "Wardrobe with lit dressing niche", hi: "लाइटिंग ड्रेसिंग निच के साथ वॉर्डरोब", gu: "લાઇટિંગ ડ્રેસિંગ નીચ સાથે વૉર્ડરોબ" } },
      { src: '07-interior.jpg', cap: { en: "Kitchen & crockery unit", hi: "किचन और क्रॉकरी यूनिट", gu: "કિચન અને ક્રોકરી યુનિટ" } },
      { src: '08-interior.jpg', cap: { en: "Bedroom in soft taupe", hi: "सॉफ़्ट टॉप रंग में बेडरूम", gu: "સોફ્ટ ટૉપ રંગમાં બેડરૂમ" } },
      { src: '09-interior.jpg', cap: { en: "Walnut & ivory bedroom", hi: "वॉलनट और आइवरी बेडरूम", gu: "વૉલનટ અને આઇવરી બેડરૂમ" } },
      { src: '10-interior.jpg', cap: { en: "Panelled bed wall & storage", hi: "पैनल बेड वॉल और स्टोरेज", gu: "પેનલ બેડ વૉલ અને સ્ટોરેજ" } },
      { src: '11-interior.jpg', cap: { en: "Tufted headboard bedroom", hi: "टफ़्टेड हेडबोर्ड बेडरूम", gu: "ટફ્ટેડ હેડબોર્ડ બેડરૂમ" } },
      { src: '12-interior.jpg', cap: { en: "Kids / guest bedroom", hi: "बच्चों / गेस्ट बेडरूम", gu: "બાળકો / ગેસ્ટ બેડરૂમ" } },
      { src: '13-interior.jpg', cap: { en: "Living corner with panelled wall", hi: "पैनल वॉल के साथ लिविंग कॉर्नर", gu: "પેનલ વૉલ સાથે લિવિંગ કૉર્નર" } },
      { src: '14-interior.jpg', cap: { en: "Sage-green wardrobe & jaali panel", hi: "सेज-ग्रीन वॉर्डरोब और जाली पैनल", gu: "સેજ-ગ્રીન વૉર્ડરોબ અને જાળી પેનલ" } },
      { src: '15-interior.jpg', cap: { en: "Light-filled bedroom", hi: "रोशनी से भरा बेडरूम", gu: "પ્રકાશથી ભરેલો બેડરૂમ" } },
      { src: '16-interior.jpg', cap: { en: "Floor-to-ceiling glass & balcony", hi: "फ़्लोर-टू-सीलिंग ग्लास और बालकनी", gu: "ફ્લોર-ટુ-સીલિંગ ગ્લાસ અને બાલ્કની" } }
    ]
  },

  /* ---------- GAVAN FOUNDATION — work on ground ----------
     Add photos to gallery (first = cover). video is optional (mp4). */
  foundation: {
    name: 'Gavan Foundation',
    title: { en: 'Ration kit distribution drive', hi: 'राशन किट वितरण अभियान', gu: 'રાશન કિટ વિતરણ અભિયાન' },
    text: { en: 'Gavan Foundation volunteers reached families in need with ration kits — atta and daily essentials — delivered hand to hand.',
            hi: 'गवन फाउंडेशन के स्वयंसेवकों ने ज़रूरतमंद परिवारों तक राशन किट — आटा और रोज़ की ज़रूरी चीज़ें — हाथों-हाथ पहुँचाईं।',
            gu: 'ગવન ફાઉન્ડેશનના સ્વયંસેવકોએ જરૂરિયાતમંદ પરિવારો સુધી રાશન કિટ — લોટ અને રોજિંદી જરૂરી વસ્તુઓ — હાથોહાથ પહોંચાડી.' },
    video: 'assets/img/foundation/drive.mp4', poster: 'assets/img/foundation/drive-poster.jpg',
    galleryPath: 'assets/img/foundation/',
    gallery: [
        { src: '01-seva.jpg', cap: { en: "Ration kits handed to families", hi: "परिवारों को राशन किट वितरण", gu: "પરિવારોને રાશન કિટ વિતરણ" } },
        { src: '02-seva.jpg', cap: { en: "A smile for every family", hi: "हर परिवार के चेहरे पर मुस्कान", gu: "દરેક પરિવારના ચહેરા પર સ્મિત" } },
        { src: '03-seva.jpg', cap: { en: "Seva, hand to hand", hi: "हाथों-हाथ सेवा", gu: "હાથોહાથ સેવા" } },
        { src: '04-seva.jpg', cap: { en: "Volunteers distributing kits", hi: "स्वयंसेवक किट बाँटते हुए", gu: "સ્વયંસેવકો કિટ વહેંચતા" } },
        { src: '05-seva.jpg', cap: { en: "Atta & essentials for every home", hi: "हर घर के लिए आटा और ज़रूरी सामान", gu: "દરેક ઘર માટે લોટ અને જરૂરી સામાન" } },
        { src: '06-seva.jpg', cap: { en: "Meeting families in person", hi: "परिवारों से व्यक्तिगत मुलाक़ात", gu: "પરિવારોને રૂબરૂ મળવું" } },
        { src: '07-seva.jpg', cap: { en: "Every bag counts", hi: "हर थैला मायने रखता है", gu: "દરેક થેલી મહત્ત્વની" } },
        { src: '08-seva.jpg', cap: { en: "Together for the community", hi: "समाज के लिए साथ मिलकर", gu: "સમાજ માટે સાથે મળીને" } },
        { src: '09-seva.jpg', cap: { en: "The Gavan Foundation team on ground", hi: "मैदान पर गवन फाउंडेशन टीम", gu: "મેદાન પર ગવન ફાઉન્ડેશન ટીમ" } }
    ]
  },

  /* ---------- FUTURE ROADMAP ---------- */
  roadmap: [
    { when: { en: 'Now', hi: 'अभी', gu: 'હાલ' }, title: { en: 'Gavan Radio Centre, Vapi', hi: 'गवन रेडियो सेंटर, वापी', gu: 'ગવન રેડિયો સેન્ટર, વાપી' }, text: { en: 'Launching a modern radiology & diagnostic centre for the region.', hi: 'क्षेत्र के लिए आधुनिक रेडियोलॉजी और डायग्नोस्टिक सेंटर।', gu: 'પ્રદેશ માટે આધુનિક રેડિયોલોજી અને ડાયગ્નોસ્ટિક સેન્ટર.' } },
    { when: { en: 'Next', hi: 'आगे', gu: 'આગળ' }, title: { en: 'Industrial corridor expansion', hi: 'इंडस्ट्रियल कॉरिडोर विस्तार', gu: 'ઇન્ડસ્ટ્રીયલ કોરિડોર વિસ્તાર' }, text: { en: 'More ready-to-build industrial plots along the Vapi–Umargam belt.', hi: 'वापी–उमरगाम बेल्ट में और तैयार इंडस्ट्रियल प्लॉट।', gu: 'વાપી–ઉમરગામ પટ્ટામાં વધુ તૈયાર ઇન્ડસ્ટ્રીયલ પ્લોટ.' } },
    { when: { en: 'Growing', hi: 'विकास', gu: 'વિકાસ' }, title: { en: 'Scaling Gavan startups', hi: 'गवन स्टार्टअप्स का विस्तार', gu: 'ગવન સ્ટાર્ટઅપનો વિસ્તાર' }, text: { en: 'Taking UltraRad AI, View Box and Contrast to radiologists across India.', hi: 'UltraRad AI, View Box और Contrast को पूरे भारत के रेडियोलॉजिस्ट तक पहुँचाना।', gu: 'UltraRad AI, View Box અને Contrastને ભારતભરના રેડિયોલોજિસ્ટ સુધી પહોંચાડવા.' } },
    { when: { en: 'Always', hi: 'हमेशा', gu: 'હંમેશાં' }, title: { en: 'Gavan Foundation', hi: 'गवन फाउंडेशन', gu: 'ગવન ફાઉન્ડેશન' }, text: { en: 'Growing our giving-back as the group grows.', hi: 'ग्रुप के बढ़ने के साथ समाज के लिए योगदान भी बढ़े।', gu: 'ગ્રુપ વધે તેમ સમાજ માટેનું યોગદાન પણ વધે.' } }
  ]
};
