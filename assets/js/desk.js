/* =====================================================================
   GAVAN PROPERTY DESK — one-desk government links, calculators & news
   ---------------------------------------------------------------------
   Edit the links / news here. Text: 'English' or { en, hi, gu }.
   news[].important: true  -> also shown in the "New update" strip on the home page.
   ===================================================================== */
window.GAVAN_DESK = {
  tabs: [
    { id: 'land',  icon: 'i-doc',  label: { en: '7/12 · 8-A · Property card', hi: '7/12 · 8-A · प्रॉपर्टी कार्ड', gu: '7/12 · 8-અ · પ્રોપર્ટી કાર્ડ' } },
    { id: 'jantri', icon: 'i-calc', label: { en: 'Jantri calculator', hi: 'जंत्री कैलकुलेटर', gu: 'જંત્રી કેલ્ક્યુલેટર' } },
    { id: 'stamp', icon: 'i-stamp', label: { en: 'Stamp duty calculator', hi: 'स्टाम्प ड्यूटी कैलकुलेटर', gu: 'સ્ટેમ્પ ડ્યુટી કેલ્ક્યુલેટર' } },
    { id: 'rera',  icon: 'i-shield', label: { en: 'RERA check', hi: 'RERA जाँच', gu: 'RERA તપાસ' } },
    { id: 'tax',   icon: 'i-shop', label: { en: 'Property tax · Vero · Akarni', hi: 'प्रॉपर्टी टैक्स · वेरो · आकारणी', gu: 'મિલકત વેરો · આકારણી' } },
    { id: 'office', icon: 'i-pin', label: { en: 'Mamlatdar · Collector · NA', hi: 'मामलतदार · कलेक्टर · NA', gu: 'મામલતદાર · કલેક્ટર · NA' } },
    { id: 'news',  icon: 'i-news', label: { en: 'Real estate news', hi: 'रियल एस्टेट न्यूज़', gu: 'રિયલ એસ્ટેટ સમાચાર' } }
  ],

  /* official links — verified against the Gujarat Revenue Department website (revenuedepartment.gujarat.gov.in) */
  links: {
    land: [
      { title: { en: '7/12 & 8-A — rural land record (direct)', hi: '7/12 और 8-A — ग्रामीण ज़मीन रिकॉर्ड (सीधा)', gu: '7/12 અને 8-અ — ગ્રામ્ય જમીન રેકોર્ડ (સીધું)' },
        url: 'https://anyror.gujarat.gov.in/LandRecordRural.aspx', main: true,
        how: { en: 'Choose VF-7 (7/12) or VF-8A → District → Taluka → Village → Survey / Block no. → captcha → Get record.',
               hi: 'VF-7 (7/12) या VF-8A चुनें → ज़िला → तालुका → गाँव → सर्वे / ब्लॉक नंबर → कैप्चा → Get record.',
               gu: 'VF-7 (7/12) કે VF-8A પસંદ કરો → જિલ્લો → તાલુકો → ગામ → સર્વે / બ્લોક નંબર → કેપ્ચા → Get record.' } },
      { title: { en: 'Property card — city survey (e-Milkat)', hi: 'प्रॉपर्टी कार्ड — सिटी सर्वे (e-Milkat)', gu: 'પ્રોપર્ટી કાર્ડ — સિટી સર્વે (e-Milkat)' },
        url: 'https://e-milkat.gujarat.gov.in/',
        how: { en: 'District → City survey office → Ward → City survey no. / sheet no. → view the property card.',
               hi: 'ज़िला → सिटी सर्वे ऑफिस → वार्ड → सिटी सर्वे नंबर / शीट नंबर → प्रॉपर्टी कार्ड देखें।',
               gu: 'જિલ્લો → સિટી સર્વે કચેરી → વોર્ડ → સિટી સર્વે નંબર / શીટ નંબર → પ્રોપર્ટી કાર્ડ જુઓ.' } },
      { title: { en: 'AnyRoR home — VF-6 entries, digitally signed 7/12, owner search', hi: 'AnyRoR होम — VF-6 एंट्री, डिजिटल साइन 7/12, मालिक खोज', gu: 'AnyRoR હોમ — VF-6 નોંધ, ડિજિટલ સહીવાળું 7/12, માલિક શોધ' },
        url: 'https://anyror.gujarat.gov.in/',
        how: { en: 'Use this for mutation entries (Hakk Patrak), khata by owner name and the digitally signed copy accepted by banks.',
               hi: 'म्यूटेशन एंट्री (हक्क पत्रक), मालिक के नाम से खाता और बैंक में मान्य डिजिटल साइन कॉपी के लिए।',
               gu: 'હક્ક પત્રક (VF-6), માલિકના નામથી ખાતું અને બેંકમાં માન્ય ડિજિટલ સહીવાળી નકલ માટે.' } },
      { title: { en: 'Revenue case status (iRCMS)', hi: 'रेवेन्यू केस स्टेटस (iRCMS)', gu: 'મહેસૂલી કેસ સ્ટેટસ (iRCMS)' },
        url: 'https://ircms.gujarat.gov.in/',
        how: { en: 'Track revenue / land cases pending before Mamlatdar, Prant or Collector.', hi: 'मामलतदार, प्रांत या कलेक्टर के पास चल रहे ज़मीन के केस ट्रैक करें।', gu: 'મામલતદાર, પ્રાંત કે કલેક્ટર સમક્ષ ચાલતા જમીનના કેસ ટ્રેક કરો.' } }
    ],
    jantri: [
      { title: { en: 'Find your jantri rate (GARVI)', hi: 'अपना जंत्री रेट देखें (GARVI)', gu: 'તમારો જંત્રી દર જુઓ (GARVI)' },
        url: 'https://garvi.gujarat.gov.in/WebForm1.aspx', main: true,
        how: { en: 'Select District → Taluka → Village → land type → survey no. → Show Jantri. Enter that rate in the calculator here.',
               hi: 'ज़िला → तालुका → गाँव → ज़मीन का प्रकार → सर्वे नंबर → Show Jantri. वो रेट यहाँ कैलकुलेटर में डालें।',
               gu: 'જિલ્લો → તાલુકો → ગામ → જમીનનો પ્રકાર → સર્વે નંબર → Show Jantri. એ દર અહીં કેલ્ક્યુલેટરમાં નાખો.' } }
    ],
    stamp: [
      { title: { en: 'GARVI — registration appointment, e-challan & document search', hi: 'GARVI — रजिस्ट्रेशन अपॉइंटमेंट, ई-चालान, दस्तावेज़ खोज', gu: 'GARVI — રજિસ્ટ્રેશન એપોઇન્ટમેન્ટ, ઇ-ચલણ, દસ્તાવેજ શોધ' },
        url: 'https://garvi.gujarat.gov.in/', main: true },
      { title: { en: 'e-Stamp paper (SHCIL)', hi: 'ई-स्टाम्प पेपर (SHCIL)', gu: 'ઇ-સ્ટેમ્પ પેપર (SHCIL)' }, url: 'https://www.shcilestamp.com/' },
      { title: { en: 'Inspector General of Registration & Stamps', hi: 'इंस्पेक्टर जनरल ऑफ़ रजिस्ट्रेशन व स्टाम्प', gu: 'નોંધણી સર નિરીક્ષક અને સ્ટેમ્પ અધિક્ષક' }, url: 'https://stampsregistration.gujarat.gov.in/' }
    ],
    rera: [
      { title: { en: 'GujRERA — check any registered project', hi: 'GujRERA — कोई भी रजिस्टर्ड प्रोजेक्ट जाँचें', gu: 'GujRERA — કોઈ પણ રજિસ્ટર્ડ પ્રોજેક્ટ તપાસો' },
        url: 'https://gujrera.gujarat.gov.in/', main: true,
        how: { en: 'Open Registered Projects → search by project / promoter name, RERA no. or district (Valsad, Navsari, Surat) → check approvals, completion date and quarterly progress.',
               hi: 'Registered Projects खोलें → प्रोजेक्ट / बिल्डर का नाम, RERA नंबर या ज़िला (वलसाड, नवसारी, सूरत) से खोजें → मंज़ूरी, पूरा होने की तारीख और प्रगति देखें।',
               gu: 'Registered Projects ખોલો → પ્રોજેક્ટ / બિલ્ડરનું નામ, RERA નંબર કે જિલ્લો (વલસાડ, નવસારી, સુરત) થી શોધો → મંજૂરી, પૂર્ણ થવાની તારીખ અને પ્રગતિ જુઓ.' } }
    ],
    tax: [
      { title: { en: 'Vapi Municipal Corporation — property tax (vero)', hi: 'वापी महानगरपालिका — प्रॉपर्टी टैक्स (वेरो)', gu: 'વાપી મહાનગરપાલિકા — મિલકત વેરો' },
        url: 'https://vapicity.in/', main: true,
        how: { en: 'Pay property tax, get the assessment (akarni) details and other civic services for Vapi.', hi: 'वापी के लिए प्रॉपर्टी टैक्स, आकारणी की जानकारी और अन्य नागरिक सेवाएँ।', gu: 'વાપી માટે મિલકત વેરો, આકારણીની વિગત અને અન્ય નાગરિક સેવાઓ.' } },
      { title: { en: 'e-Nagar — Valsad, Pardi, Umargam, Dharampur & other nagarpalikas', hi: 'e-Nagar — वलसाड, पारडी, उमरगाम, धरमपुर व अन्य नगरपालिका', gu: 'e-Nagar — વલસાડ, પારડી, ઉમરગામ, ધરમપુર અને અન્ય નગરપાલિકા' },
        url: 'https://enagar.gujarat.gov.in/',
        how: { en: 'Choose your nagarpalika → property tax (vero), assessment (akarni) copy, building permission and certificates.', hi: 'अपनी नगरपालिका चुनें → प्रॉपर्टी टैक्स (वेरो), आकारणी कॉपी, बिल्डिंग परमिशन और प्रमाणपत्र।', gu: 'તમારી નગરપાલિકા પસંદ કરો → મિલકત વેરો, આકારણી નકલ, બાંધકામ પરવાનગી અને પ્રમાણપત્રો.' } },
      { title: { en: 'Surat Municipal Corporation', hi: 'सूरत महानगरपालिका', gu: 'સુરત મહાનગરપાલિકા' }, url: 'https://www.suratmunicipal.gov.in/' }
    ],
    office: [
      { title: { en: 'iORA — NA permission & online revenue applications', hi: 'iORA — NA परमिशन और ऑनलाइन रेवेन्यू आवेदन', gu: 'iORA — બિનખેતી (NA) પરવાનગી અને ઓનલાઇન મહેસૂલી અરજી' },
        url: 'https://iora.gujarat.gov.in/', main: true,
        how: { en: 'Apply online for NA, premium payment, farmer certificate and other Collector / Mamlatdar services.', hi: 'NA, प्रीमियम भुगतान, खेडूत प्रमाणपत्र और कलेक्टर / मामलतदार की अन्य सेवाओं के लिए ऑनलाइन आवेदन।', gu: 'બિનખેતી, પ્રીમિયમ ભરપાઈ, ખેડૂત પ્રમાણપત્ર અને કલેક્ટર / મામલતદારની અન્ય સેવાઓ માટે ઓનલાઇન અરજી.' } },
      { title: { en: 'Valsad Collectorate — talukas: Valsad, Vapi, Pardi, Umargam, Dharampur, Kaprada', hi: 'वलसाड कलेक्टरेट — तालुका: वलसाड, वापी, पारडी, उमरगाम, धरमपुर, कपराडा', gu: 'વલસાડ કલેક્ટર કચેરી — તાલુકા: વલસાડ, વાપી, પારડી, ઉમરગામ, ધરમપુર, કપરાડા' },
        url: 'https://valsad.nic.in/', how: { en: 'Mamlatdar office contacts, notices and district services.', hi: 'मामलतदार ऑफिस संपर्क, सूचनाएँ और ज़िला सेवाएँ।', gu: 'મામલતદાર કચેરીના સંપર્ક, જાહેરનામા અને જિલ્લા સેવાઓ.' } },
      { title: { en: 'Navsari Collectorate', hi: 'नवसारी कलेक्टरेट', gu: 'નવસારી કલેક્ટર કચેરી' }, url: 'https://navsari.nic.in/' },
      { title: { en: 'Gujarat Revenue Department', hi: 'गुजरात राजस्व विभाग', gu: 'ગુજરાત મહેસૂલ વિભાગ' }, url: 'https://revenuedepartment.gujarat.gov.in/' },
      { title: { en: 'GIDC — industrial estates & plots (Vapi, Sarigam, Umbergaon)', hi: 'GIDC — इंडस्ट्रियल एस्टेट और प्लॉट (वापी, सरीगाम, उमरगाम)', gu: 'GIDC — ઔદ્યોગિક વસાહત અને પ્લોટ (વાપી, સરીગામ, ઉમરગામ)' }, url: 'https://gidc.gujarat.gov.in/' }
    ]
  },

  /* live news searches (always fresh) */
  liveNews: [
    { q: 'Vapi real estate', label: 'Vapi real estate' },
    { q: 'Valsad property', label: 'Valsad property' },
    { q: 'Umargam Sarigam industrial', label: 'Umargam · Sarigam' },
    { q: 'Gujarat jantri', label: 'Gujarat jantri' },
    { q: 'GujRERA', label: 'GujRERA' },
    { q: 'South Gujarat infrastructure', label: 'South Gujarat infra' }
  ],

  /* curated news — newest first. important:true also shows on the home page */
  news: [
    { date: '2026-11-03', important: true, tag: 'Infrastructure',
      title: { en: '₹441 crore of development works dedicated to Valsad district, incl. a 150-bed government hospital in Vapi', hi: 'वलसाड ज़िले को ₹441 करोड़ के विकास कार्य, वापी में 150 बेड का सरकारी अस्पताल शामिल', gu: 'વલસાડ જિલ્લાને ₹441 કરોડના વિકાસ કાર્યો, વાપીમાં 150 બેડની સરકારી હોસ્પિટલ સહિત' },
      source: 'tennews.in', url: 'https://tennews.in/ahead-of-diwali-gujarat-cm-dedicates-rs-441-crore-development-works-to-valsad' },
    { date: '2026-10', important: true, tag: 'Jantri',
      title: { en: 'New jantri rates still not notified — 2023 rates continue for stamp duty', hi: 'नए जंत्री रेट अभी लागू नहीं — स्टाम्प ड्यूटी के लिए 2023 के रेट जारी', gu: 'નવા જંત્રી દર હજુ લાગુ નથી — સ્ટેમ્પ ડ્યુટી માટે 2023 ના દર ચાલુ' },
      source: 'laxmigroup.co', url: 'https://www.laxmigroup.co/articles/jantri-rate-in-gujarat/' },
    { date: '2026-07', important: true, tag: 'Property tax',
      title: { en: 'Vapi Municipal Corporation: 1% rebate on online property tax payment (Jul 2026 – Mar 2027, non-commercial)', hi: 'वापी महानगरपालिका: ऑनलाइन प्रॉपर्टी टैक्स पर 1% छूट (जुलाई 2026 – मार्च 2027, गैर-व्यावसायिक)', gu: 'વાપી મહાનગરપાલિકા: ઓનલાઇન મિલકત વેરા પર 1% વળતર (જુલાઈ 2026 – માર્ચ 2027, બિન-વાણિજ્યિક)' },
      source: 'vapicity.in', url: 'https://vapicity.in/' },
    { date: '2026-02-25', tag: 'Real estate',
      title: { en: 'Income Tax searches on real estate groups in Surat & Navsari over cash above jantri value', hi: 'सूरत और नवसारी में रियल एस्टेट ग्रुप्स पर इनकम टैक्स की तलाशी', gu: 'સુરત અને નવસારીમાં રિયલ એસ્ટેટ ગ્રુપ પર ઇન્કમ ટેક્સના દરોડા' },
      source: 'deshgujarat.com', url: 'https://deshgujarat.com/2026/02/25/it-dept-conducts-searches-on-real-estate-groups-in-surat-navsari/' },
    { date: '2025-01-01', tag: 'Civic',
      title: { en: 'Vapi upgraded from Nagarpalika to Municipal Corporation', hi: 'वापी नगरपालिका से महानगरपालिका बनी', gu: 'વાપી નગરપાલિકામાંથી મહાનગરપાલિકા બની' },
      source: 'vapicity.in', url: 'https://vapicity.in/history' }
  ]
};
