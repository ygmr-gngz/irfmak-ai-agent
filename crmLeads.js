require('dotenv').config();

const supabase = require('./supabase');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const leadsFile = path.join(__dirname, 'data', 'leads.json');

function readLocalLeads() {
  try {
    if (fs.existsSync(leadsFile)) {
      return JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
    }
  } catch {}
  return [];
}

function writeLocalLeads(leads) {
  fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), 'utf8');
}

async function saveLead(data) {
  const lead = {
    id: crypto.randomUUID(),
    source: data.source || 'unknown',
    platform_user_id: data.platform_user_id || null,
    customer_name: data.customer_name || null,
    customer_phone: data.customer_phone || null,
    message: data.message || null,
    auto_replied: data.auto_replied || false,
    keywords_matched: Array.isArray(data.keywords_matched)
      ? data.keywords_matched.join(', ')
      : (data.keywords_matched || null),
    handoff_reason: data.handoff_reason || null,
    status: 'new',
    created_at: new Date().toISOString()
  };

  // Yerel dosyaya kaydet (Supabase bağlanamasa da çalışır)
  const all = readLocalLeads();
  all.push(lead);
  writeLocalLeads(all);

  // Supabase'e kaydet
  try {
    const { error } = await supabase.from('crm_leads').insert(lead);
    if (error) {
      console.error('⚠️  Supabase lead kayıt hatası:', error.message);
    } else {
      console.log('✅ Lead Supabase\'e kaydedildi:', lead.id);
    }
  } catch (err) {
    console.error('⚠️  Supabase bağlantı hatası:', err.message);
  }

  return lead;
}

async function getLeads({ limit = 100, source } = {}) {
  try {
    let query = supabase
      .from('crm_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (source) query = query.eq('source', source);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    const all = readLocalLeads().reverse();
    const filtered = source ? all.filter(l => l.source === source) : all;
    return filtered.slice(0, limit);
  }
}

module.exports = { saveLead, getLeads };
