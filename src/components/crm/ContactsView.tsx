import React, { useEffect, useMemo, useState } from 'react';
import { HugeIcon, Search01Icon, UserGroupIcon } from '../icons/HugeIcon';

type SavedContact = {
  id: number;
  remoteJid: string;
  phone?: string;
  name?: string;
  avatarUrl?: string;
  tags?: string[];
  notes?: string;
  status?: string;
  createdAt?: string;
};

interface ContactsViewProps {
  onOpenMobileMenu?: () => void;
  onNavigateToCrm?: () => void;
}

function normalizePhone(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onOpenMobileMenu, onNavigateToCrm }) => {
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/leads');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao carregar contatos');
      setContacts(Array.isArray(data.leads) ? data.leads : []);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContacts(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.phone, contact.notes, ...(contact.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [contacts, query]);

  const saveContact = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = normalizePhone(phone);
    if (digits.length < 8) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const remoteJid = `${digits}@s.whatsapp.net`;
      const res = await fetch('/api/client/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteJid,
          phone: digits,
          name: name.trim() || digits,
          notes: notes.trim() || undefined,
          tags: ['Contato salvo'],
          status: 'new',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao salvar contato');
      setName('');
      setPhone('');
      setNotes('');
      await loadContacts();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar contato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#f7faf8] pb-24 lg:pb-6">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onOpenMobileMenu} className="lg:hidden w-10 h-10 rounded-xl bg-white border border-[#e1e9e4] flex items-center justify-center text-[#12382c]">☰</button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#142d23]">Contatos</h1>
            <p className="text-sm text-[#6a7d73]">Salve os contatos da prospecção direto no banco do Groply.</p>
          </div>
          <button onClick={onNavigateToCrm} className="hidden sm:block px-4 py-2 rounded-xl border border-[#d8e4dd] bg-white text-sm font-semibold text-[#12382c]">Abrir CRM</button>
        </div>

        <form onSubmit={saveContact} className="bg-white border border-[#e1e9e4] rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-4 text-[#12382c]">
            <span className="text-xl leading-none font-bold">+</span>
            <h2 className="font-bold">Salvar novo contato</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfc] px-3.5 py-3 text-sm outline-none focus:border-[#0f8b61]" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfc] px-3.5 py-3 text-sm outline-none focus:border-[#0f8b61]" />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação (opcional)" rows={2} className="mt-3 w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfc] px-3.5 py-3 text-sm outline-none resize-none focus:border-[#0f8b61]" />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <button disabled={saving} className="mt-3 w-full sm:w-auto px-5 py-3 rounded-xl bg-[#12382c] text-white text-sm font-bold disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar contato'}
          </button>
        </form>

        <div className="bg-white border border-[#e1e9e4] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#edf1ee] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <HugeIcon icon={UserGroupIcon} size={20} />
              <h2 className="font-bold text-[#142d23]">Contatos salvos</h2>
              <span className="text-xs font-bold bg-[#eaf4ef] text-[#12382c] px-2 py-1 rounded-full">{contacts.length}</span>
            </div>
            <div className="relative sm:w-72">
              <HugeIcon icon={Search01Icon} size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73847b]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar contato..." className="w-full rounded-xl border border-[#dce6e0] pl-9 pr-3 py-2.5 text-sm outline-none" />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[#6a7d73]">Carregando contatos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6a7d73]">Nenhum contato salvo ainda.</div>
          ) : (
            <div className="divide-y divide-[#edf1ee]">
              {filtered.map((contact) => (
                <div key={contact.id || contact.remoteJid} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[#eaf4ef] text-[#12382c] flex items-center justify-center font-bold">
                    {(contact.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-[#142d23] truncate">{contact.name || 'Sem nome'}</div>
                    <div className="text-xs text-[#6a7d73] truncate">{contact.phone || contact.remoteJid}</div>
                    {contact.notes && <div className="text-xs text-[#87958e] truncate mt-0.5">{contact.notes}</div>}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#f0f5f2] text-[#587066]">{contact.status === 'new' ? 'Novo' : contact.status || 'Salvo'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
