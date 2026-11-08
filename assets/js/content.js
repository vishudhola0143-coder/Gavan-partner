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
