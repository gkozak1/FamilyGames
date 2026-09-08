(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.FIELD_APP_CORE = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function cleanText(value) { return String(value == null ? '' : value).trim().replace(/\s+/g, ' '); }
  function normalizeText(value) { return cleanText(value).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
  function numeric(value) { const n = Number(String(value).trim()); return Number.isFinite(n) ? n : NaN; }

  function validateChallenge(challenge, value) {
    if (!challenge) return { ok:false, message:'Challenge unavailable.' };
    if (challenge.type === 'number') {
      const n = numeric(value); if (!Number.isFinite(n)) return {ok:false,message:'Enter a number.'};
      return n === Number(challenge.expected) ? {ok:true,canonical:n} : {ok:false,message:'Recheck the evidence, or use Assistant Override.'};
    }
    if (challenge.type === 'positiveNumber') {
      const n = numeric(value); return n > 0 ? {ok:true,canonical:n} : {ok:false,message:'Enter a reasonable positive estimate.'};
    }
    if (challenge.type === 'text') {
      const n = normalizeText(value); const vals = (Array.isArray(challenge.expected)?challenge.expected:[challenge.expected]).map(normalizeText);
      const ok = vals.some(v => n === v || n.includes(v) || v.includes(n));
      return ok ? {ok:true,canonical:cleanText(value)} : {ok:false,message:'Recheck the evidence, or use Assistant Override.'};
    }
    if (challenge.type === 'keywords') {
      const n = normalizeText(value); const ok = challenge.expected.every(k => n.includes(normalizeText(k)));
      return ok ? {ok:true,canonical:cleanText(value)} : {ok:false,message:'Record both observed objects.'};
    }
    if (challenge.type === 'triple' || challenge.type === 'pair') {
      if (!Array.isArray(value)) return {ok:false,message:'Complete each field.'};
      const nums = value.map(numeric), exp = challenge.expected.map(Number);
      const ok = nums.length === exp.length && nums.every((n,i)=>Number.isFinite(n)&&n===exp[i]);
      return ok ? {ok:true,canonical:nums} : {ok:false,message:'Recheck the counts, or use Assistant Override.'};
    }
    if (challenge.type === 'list') {
      const items = Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
      return items.length >= Number(challenge.minItems||1) ? {ok:true,canonical:items} : {ok:false,message:`Record at least ${challenge.minItems} separate features.`};
    }
    if (challenge.type === 'twoText') {
      const items = Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
      return items.length >= 2 ? {ok:true,canonical:items.slice(0,2)} : {ok:false,message:'Record two separate observations.'};
    }
    if (challenge.type === 'textAny') {
      const text = cleanText(value); return text.length >= 2 ? {ok:true,canonical:text} : {ok:false,message:'Record a brief observation.'};
    }
    return {ok:false,message:'Unsupported evidence type.'};
  }

  function validateSynthesis(site, evidence, value) {
    if (!site.synthesis) return {ok:true,canonical:null};
    if (site.synthesis.kind === 'kopps') {
      const n = numeric(value); return n === 1 ? {ok:true,canonical:n} : {ok:false,message:'Recheck the two team values and their absolute difference.'};
    }
    if (site.synthesis.kind === 'dunes') {
      const v = value || {}; const ok = Boolean(v.differentAnimals) && v.earlier === 'peacock' && v.later === 'mustard';
      return ok ? {ok:true,canonical:v} : {ok:false,message:'Reconcile the paired observations.'};
    }
    return {ok:false,message:'Unsupported team convergence.'};
  }

  function allEvidenceComplete(config, site, sessionState) {
    return config.personaOrder.every(pid => sessionState?.evidence?.[site.id]?.[pid]?.complete);
  }
  function siteComplete(config, site, sessionState) {
    if (!allEvidenceComplete(config, site, sessionState)) return false;
    return !site.synthesis || Boolean(sessionState?.synthesis?.[site.id]?.complete);
  }
  function formatEvidence(challenge, record) {
    if (!record) return 'PENDING';
    if (record.override) return 'ASSISTANT VERIFIED';
    if (typeof challenge.engine === 'function') return challenge.engine(record.value);
    if (Array.isArray(record.value)) return record.value.join(' · ');
    return cleanText(record.value);
  }
  function deriveKopps(e) {
    const s=numeric(e?.scarlet?.value), p=numeric(e?.peacock?.value), l=numeric(e?.plum?.value);
    const m=Array.isArray(e?.mustard?.value)?e.mustard.value.map(numeric):[];
    if (![s,p,l].every(Number.isFinite)||m.length!==3||!m.every(Number.isFinite)) return null;
    return { pairOne:p+l, pairTwo:s-m[0]+m[1]-m[2], difference:Math.abs((p+l)-(s-m[0]+m[1]-m[2])) };
  }
  function sortCiphers(ciphersObj) {
    return Object.entries(ciphersObj||{}).map(([siteId,c])=>({siteId,...c})).sort((a,b)=>Number(a.number)-Number(b.number));
  }
  return { cleanText, normalizeText, numeric, validateChallenge, validateSynthesis, allEvidenceComplete, siteComplete, formatEvidence, deriveKopps, sortCiphers };
});
