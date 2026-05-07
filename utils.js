const COUNTRY_FLAGS = {
  US:'🇺🇸',GB:'🇬🇧',CA:'🇨🇦',FR:'🇫🇷',DE:'🇩🇪',NL:'🇳🇱',SE:'🇸🇪',FI:'🇫🇮',
  DK:'🇩🇰',NO:'🇳🇴',BE:'🇧🇪',ES:'🇪🇸',IT:'🇮🇹',PT:'🇵🇹',PL:'🇵🇱',RU:'🇷🇺',
  UA:'🇺🇦',RO:'🇷🇴',CZ:'🇨🇿',AT:'🇦🇹',CH:'🇨🇭',IE:'🇮🇪',LT:'🇱🇹',LV:'🇱🇻',
  EE:'🇪🇪',BG:'🇧🇬',GR:'🇬🇷',HU:'🇭🇺',SK:'🇸🇰',CN:'🇨🇳',HK:'🇭🇰',TW:'🇹🇼',
  JP:'🇯🇵',KR:'🇰🇷',IN:'🇮🇳',ID:'🇮🇩',PH:'🇵🇭',MY:'🇲🇾',SG:'🇸🇬',TH:'🇹🇭',
  VN:'🇻🇳',AU:'🇦🇺',NZ:'🇳🇿',BR:'🇧🇷',MX:'🇲🇽',AR:'🇦🇷',CL:'🇨🇱',ZA:'🇿🇦',
  NG:'🇳🇬',EG:'🇪🇬',MA:'🇲🇦',SA:'🇸🇦',AE:'🇦🇪',IL:'🇮🇱',TR:'🇹🇷',PK:'🇵🇰',
  BD:'🇧🇩',KZ:'🇰🇿',
};
const COUNTRY_BY_DIAL = {
  '1':'US','7':'RU','20':'EG','27':'ZA','30':'GR','31':'NL','32':'BE','33':'FR',
  '34':'ES','36':'HU','39':'IT','40':'RO','41':'CH','43':'AT','44':'GB','45':'DK',
  '46':'SE','47':'NO','48':'PL','49':'DE','52':'MX','54':'AR','55':'BR','56':'CL',
  '60':'MY','61':'AU','62':'ID','63':'PH','64':'NZ','65':'SG','66':'TH','81':'JP',
  '82':'KR','84':'VN','86':'CN','90':'TR','91':'IN','92':'PK','212':'MA','852':'HK',
  '880':'BD','886':'TW','966':'SA','971':'AE','972':'IL','370':'LT','371':'LV',
  '372':'EE','358':'FI','359':'BG','353':'IE','380':'UA','420':'CZ','421':'SK',
};
const COUNTRY_NAME = {
  US:'United States',GB:'United Kingdom',CA:'Canada',FR:'France',DE:'Germany',
  NL:'Netherlands',SE:'Sweden',FI:'Finland',DK:'Denmark',NO:'Norway',BE:'Belgium',
  ES:'Spain',IT:'Italy',PT:'Portugal',PL:'Poland',RU:'Russia',UA:'Ukraine',
  RO:'Romania',CZ:'Czechia',AT:'Austria',CH:'Switzerland',IE:'Ireland',LT:'Lithuania',
  LV:'Latvia',EE:'Estonia',BG:'Bulgaria',GR:'Greece',HU:'Hungary',SK:'Slovakia',
  CN:'China',HK:'Hong Kong',TW:'Taiwan',JP:'Japan',KR:'South Korea',IN:'India',
  ID:'Indonesia',PH:'Philippines',MY:'Malaysia',SG:'Singapore',TH:'Thailand',
  VN:'Vietnam',AU:'Australia',NZ:'New Zealand',BR:'Brazil',MX:'Mexico',AR:'Argentina',
  CL:'Chile',ZA:'South Africa',NG:'Nigeria',EG:'Egypt',MA:'Morocco',SA:'Saudi Arabia',
  AE:'UAE',IL:'Israel',TR:'Turkey',PK:'Pakistan',BD:'Bangladesh',KZ:'Kazakhstan',
};
function flagFor(code) {
  if (!code) return '🌐';
  return COUNTRY_FLAGS[String(code).toUpperCase()] || '🌐';
}
function countryNameFor(code) {
  if (!code) return 'Unknown';
  return COUNTRY_NAME[String(code).toUpperCase()] || String(code).toUpperCase();
}
function countryFromNumber(num) {
  if (!num) return null;
  const d = String(num).replace(/[^0-9]/g, '');
  for (let len = 4; len >= 1; len--) {
    const p = d.slice(0, len);
    if (COUNTRY_BY_DIAL[p]) return COUNTRY_BY_DIAL[p];
  }
  return null;
}
function normalizeNumber(num) {
  if (!num) return '';
  const d = String(num).replace(/[^0-9]/g, '');
  return d ? `+${d}` : '';
}
function extractOTP(text) {
  if (!text) return null;
  const m = String(text).match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}
function safeText(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};
module.exports = { flagFor, countryNameFor, countryFromNumber, normalizeNumber, extractOTP, safeText, BROWSER_HEADERS };
