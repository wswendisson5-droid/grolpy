import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Users,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Search,
  Check,
  AlertCircle,
  Eye,
  RefreshCw,
  Send,
  Trash2,
  Bookmark,
  SlidersHorizontal,
  Smile,
  Paperclip,
  Camera,
  Mic,
  CalendarDays,
  Zap,
} from 'lucide-react';
import { DivulgacaoCard, ClientGroup } from '../types';
import { clientService } from '../../../services/clientService';
import { planService } from '../../../services/planService';
import {
  GroupLimitModal,
  MonthlySendsLimitModal,
  CampaignsLimitModal,
  DailyRoundsLimitModal,
} from '../modals/PlanLimitModals';

interface ClientNovaDivulgacaoViewProps {
  onBack: () => void;
  onSaveCampaign: (campaign: DivulgacaoCard, createAgenda?: boolean) => void;
  onNavigateToConnection: () => void;
  onNavigateToPlanos?: () => void;
  campaigns?: DivulgacaoCard[];
  groups?: ClientGroup[];
  isWhatsappConnected?: boolean;
  editingCampaign?: DivulgacaoCard | null;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  name?: string;
}

export const ClientNovaDivulgacaoView: React.FC<ClientNovaDivulgacaoViewProps> = ({
  onBack,
  onSaveCampaign,
  onNavigateToConnection,
  onNavigateToPlanos,
  campaigns = [],
  groups = [],
  isWhatsappConnected: propWhatsappConnected,
  editingCampaign = null,
}) => {
  // Stepper State (1: Mensagem, 2: Grupos, 3: Programação, 4: Revisar)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Plan Entitlement Limits Modals
  const [isGroupLimitModalOpen, setIsGroupLimitModalOpen] = useState(false);
  const [groupLimitData, setGroupLimitData] = useState({ limit: 45, used: 45 });

  const [isCampaignsLimitModalOpen, setIsCampaignsLimitModalOpen] = useState(false);
  const [campaignsLimitData, setCampaignsLimitData] = useState({ limit: 5, activeCount: 5 });

  const [isMonthlySendsModalOpen, setIsMonthlySendsModalOpen] = useState(false);
  const [monthlySendsData, setMonthlySendsData] = useState({ limit: 2700, used: 2700 });

  const [isDailyRoundsModalOpen, setIsDailyRoundsModalOpen] = useState(false);
  const [dailyRoundsData, setDailyRoundsData] = useState({
    limit: 2,
    groupName: '',
    existingSendTime: '',
    alreadySentToday: 0,
  });

  const currentPlan = planService.getSubscription().plan;
  const campaignsForValidation = editingCampaign
    ? campaigns.filter((campaign) => campaign.id !== editingCampaign.id)
    : campaigns;
  const existingUniqueGroups = planService.getUniqueGroupJidsInAutomations(campaignsForValidation);

  const localDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ETAPA 1: Mensagem & Mídia
  const [title, setTitle] = useState(editingCampaign?.title || '');
  const [category, setCategory] = useState(editingCampaign?.category || 'Vendas & Ofertas');
  const [messageText, setMessageText] = useState(editingCampaign?.previewText || '');
  const [mediaList, setMediaList] = useState<MediaItem[]>(editingCampaign?.mediaList || []);
  const [sendAsAlbum, setSendAsAlbum] = useState(editingCampaign?.sendAsAlbum || false);
  const [addCaptionToMedia, setAddCaptionToMedia] = useState(editingCampaign?.addCaptionToMedia ?? true);

  // ETAPA 2: Grupos reais do WhatsApp
  const [availableGroups, setAvailableGroups] = useState<ClientGroup[]>(() => {
    return (groups || []).filter((g) => {
      const jid = String(g.jid || g.id || '');
      return jid.includes('@g.us') && !jid.includes('@broadcast') && !jid.includes('@newsletter');
    });
  });
  const [selectedGroupJids, setSelectedGroupJids] = useState<string[]>(editingCampaign?.selectedGroupJids || []);
  const [groupSearch, setGroupSearch] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [isWhatsappConnected, setIsWhatsappConnected] = useState<boolean>(() => {
    if (propWhatsappConnected !== undefined) return propWhatsappConnected;
    return clientService.isWhatsAppConnected();
  });

  useEffect(() => {
    const valid = (groups || []).filter((g) => {
      const jid = String(g.jid || g.id || '');
      return jid.includes('@g.us') && !jid.includes('@broadcast') && !jid.includes('@newsletter');
    });
    setAvailableGroups(valid);
    if (valid.length > 0) {
      setIsWhatsappConnected(true);
    }
  }, [groups]);

  useEffect(() => {
    if (propWhatsappConnected !== undefined) {
      setIsWhatsappConnected(propWhatsappConnected);
    }
  }, [propWhatsappConnected]);

  // ETAPA 3: Programação
  const [scheduleMode, setScheduleMode] = useState<'agendar' | 'recorrente' | 'imediato'>(
    editingCampaign?.scheduleMode === 'recorrente' || editingCampaign?.scheduleMode === 'imediato'
      ? editingCampaign.scheduleMode
      : 'agendar'
  );
  const [startDate, setStartDate] = useState(() => editingCampaign?.scheduleDate || localDateInputValue());
  const [startTime, setStartTime] = useState(editingCampaign?.scheduleTime && editingCampaign.scheduleTime !== 'Agora' ? editingCampaign.scheduleTime : '14:00');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(
    editingCampaign?.scheduleTimes?.length
      ? editingCampaign.scheduleTimes
      : [editingCampaign?.scheduleTime && editingCampaign.scheduleTime !== 'Agora' ? editingCampaign.scheduleTime : '14:00']
  );
  const [newTimeInput, setNewTimeInput] = useState('18:00');
  const [intervalMinutes, setIntervalMinutes] = useState(editingCampaign?.intervalMinutes || 2);
  const [delaySeconds, setDelaySeconds] = useState(editingCampaign?.delaySeconds || 120);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    editingCampaign?.scheduleMode === 'recorrente' && editingCampaign.scheduleDays
      ? editingCampaign.scheduleDays.split(',').map((d) => d.trim()).filter(Boolean)
      : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
  );
  const [dailyLimit, setDailyLimit] = useState(editingCampaign?.dailyLimit || 'Sem limite');

  // Add a new recurring time slot
  const handleAddScheduleTime = () => {
    if (newTimeInput && !scheduleTimes.includes(newTimeInput)) {
      setScheduleTimes((prev) => [...prev, newTimeInput].sort());
    }
  };

  const handleRemoveScheduleTime = (t: string) => {
    if (scheduleTimes.length > 1) {
      setScheduleTimes((prev) => prev.filter((item) => item !== t));
    }
  };

  // UI state
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Load real WhatsApp instance groups fast with 0ms delay
  const fetchRealGroups = async (force: boolean = false) => {
    if (availableGroups.length === 0 && groups.length === 0) {
      setLoadingGroups(true);
    }
    try {
      const raw = await clientService.getRealGroups(clientService.getDefaultInstance(), force);
      const real = (raw || []).filter((g) => {
        const jid = String(g.jid || g.id || '');
        return jid.includes('@g.us') && !jid.includes('@broadcast') && !jid.includes('@newsletter');
      });
      if (real.length > 0) {
        setAvailableGroups(real);
        setIsWhatsappConnected(true);
      } else if (groups.length > 0) {
        const validProp = groups.filter((g) => {
          const jid = String(g.jid || g.id || '');
          return jid.includes('@g.us') && !jid.includes('@broadcast') && !jid.includes('@newsletter');
        });
        setAvailableGroups(validProp);
        setIsWhatsappConnected(validProp.length > 0);
      } else {
        setAvailableGroups([]);
      }
    } catch {
      // keep cached
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchRealGroups();
  }, []);

  // Filter groups: strictly WhatsApp groups (@g.us)
  const filteredGroups = availableGroups.filter((g) => {
    const jid = String(g.jid || g.id || '');
    if (!jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter')) return false;
    if (groupSearch.trim()) {
      const q = groupSearch.toLowerCase();
      const matchName = (g.name || '').toLowerCase().includes(q);
      const matchCat = (g.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  const selectedGroupsList = availableGroups.filter((g) =>
    selectedGroupJids.includes(g.jid || g.id),
  );

  const totalMembersSelected = selectedGroupsList.reduce(
    (sum, g) => sum + (g.membersCount || 0),
    0,
  );

  // Group selection togglers with Plan Limit enforcement
  const toggleGroupSelection = (jid: string) => {
    if (selectedGroupJids.includes(jid)) {
      setSelectedGroupJids((prev) => prev.filter((id) => id !== jid));
    } else {
      const check = planService.canSelectGroup(campaigns, selectedGroupJids, jid);
      if (!check.allowed) {
        setGroupLimitData({ limit: check.limit, used: check.currentUsed });
        setIsGroupLimitModalOpen(true);
        return;
      }
      setSelectedGroupJids((prev) => [...prev, jid]);
    }
  };

  const handleSelectAll = () => {
    if (selectedGroupJids.length === availableGroups.length && availableGroups.length > 0) {
      setSelectedGroupJids([]);
    } else {
      const newSelection: string[] = [];
      let reachedLimit = false;

      for (const g of availableGroups) {
        const jid = g.jid || g.id;
        const check = planService.canSelectGroup(campaigns, newSelection, jid);
        if (check.allowed) {
          newSelection.push(jid);
        } else {
          reachedLimit = true;
        }
      }

      setSelectedGroupJids(newSelection);
      if (reachedLimit) {
        setGroupLimitData({ limit: currentPlan.maxGroups, used: currentPlan.maxGroups });
        setIsGroupLimitModalOpen(true);
      }
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const compressImageIfNeeded = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
      reader.onload = () => {
        if (typeof reader.result !== 'string') return reject(new Error('Resultado inválido'));
        const img = new Image();
        img.onerror = () => reject(new Error('Falha ao processar imagem'));
        img.onload = () => {
          try {
            const MAX_WIDTH = 1280;
            const MAX_HEIGHT = 1280;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              if (width > height) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              } else {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve(reader.result as string);
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed);
          } catch {
            resolve(reader.result as string);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Media Handlers
  const handleAddMedia = async (type: 'image' | 'video' | 'document', file?: File) => {
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        setValidationError('O arquivo selecionado excede o limite de 16MB. Por favor, escolha um arquivo menor.');
        return;
      }
      if (type === 'image') {
        // Show the selected image immediately on the first tap. Compression can be
        // expensive on mobile, so it must not block the preview from appearing.
        const mediaId = `m-${Date.now()}`;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          setMediaList((prev) => [...prev, { id: mediaId, type, url: reader.result as string, name: file.name }]);
          void compressImageIfNeeded(file).then((optimizedDataUrl) => {
            setMediaList((prev) => prev.map((item) => item.id === mediaId ? { ...item, url: optimizedDataUrl } : item));
          }).catch(() => {});
        };
        reader.onerror = () => setValidationError('Não foi possível carregar a imagem selecionada.');
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newMedia: MediaItem = {
            id: `m-${Date.now()}`,
            type,
            url: reader.result,
            name: file.name,
          };
          setMediaList((prev) => [...prev, newMedia]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  };

  // Step Validation & Navigation
  const validateStep = (step: number): boolean => {
    setValidationError('');
    if (step === 1) {
      if (!title.trim()) {
        setValidationError('Por favor, informe o título da divulgação.');
        return false;
      }
      if (!messageText.trim()) {
        setValidationError('Por favor, digite a mensagem de texto da divulgação.');
        return false;
      }
    }
    if (step === 2) {
      if (selectedGroupJids.length === 0) {
        setValidationError('Selecione ao menos 1 grupo de destino para prosseguir.');
        return false;
      }
    }
    if (step === 3) {
      if (scheduleMode === 'recorrente' && selectedDays.length === 0) {
        setValidationError('Selecione ao menos um dia da semana para o envio recorrente.');
        return false;
      }
      if (scheduleMode === 'agendar' && !startDate) {
        setValidationError('Selecione uma data válida para o agendamento.');
        return false;
      }
      // Check Daily Rounds limit per plan
      const roundsCount = scheduleMode === 'recorrente' ? scheduleTimes.length : 1;
      const roundCheck = planService.checkDailyRoundsLimit(
        campaignsForValidation,
        selectedGroupJids,
        availableGroups.map((g) => ({ jid: g.jid || g.id, name: g.name })),
        roundsCount,
      );
      if (!roundCheck.allowed) {
        setDailyRoundsData({
          limit: roundCheck.limit,
          groupName: roundCheck.groupName || 'Grupo Selecionado',
          existingSendTime: roundCheck.existingSendTime || '14:00',
          alreadySentToday: roundCheck.alreadySentToday || 1,
        });
        setIsDailyRoundsModalOpen(true);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((s) => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrev = () => {
    setValidationError('');
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  // Helper to calculate sequential times based on start time, interval and selected groups
  const calculateSequentialTimes = () => {
    const baseTime = startTime || '04:33';
    const [hStr, mStr] = baseTime.split(':');
    let h = parseInt(hStr || '4', 10);
    let m = parseInt(mStr || '33', 10);
    if (isNaN(h)) h = 4;
    if (isNaN(m)) m = 33;

    const intervalSec = delaySeconds || 120;
    const intervalMins = Math.max(1, Math.round(intervalSec / 60));

    const count = Math.max(1, selectedGroupJids.length);
    const times: Array<{ index: number; groupName: string; time: string; intervalOffset: string }> = [];

    let currentTotalMinutes = h * 60 + m;

    for (let i = 0; i < Math.min(count, 5); i++) {
      const jid = selectedGroupJids[i];
      const grp = availableGroups.find((g) => g.id === jid);
      const name = grp?.name || `Grupo ${i + 1}`;

      const curH = Math.floor((currentTotalMinutes / 60) % 24);
      const curM = Math.floor(currentTotalMinutes % 60);
      const formattedTime = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;

      times.push({
        index: i + 1,
        groupName: name,
        time: scheduleMode === 'imediato' ? (i === 0 ? 'Agora' : `+${i * intervalMins} min`) : formattedTime,
        intervalOffset: i === 0 ? 'Primeiro disparo' : `+${intervalSec < 60 ? `${i * intervalSec}s` : `${i * intervalMins} min`}`,
      });

      currentTotalMinutes += intervalMins;
    }
    return times;
  };

  // Save Campaign to backend and trigger dispatch if immediate
  const handleFinalSubmit = async (activateNow: boolean = true, sendImmediately: boolean = false) => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    // Plan validation 1: Active campaigns limit
    if (activateNow) {
      const activeCheck = planService.canActivateCampaign(campaignsForValidation);
      if (!activeCheck.allowed) {
        setCampaignsLimitData({ limit: activeCheck.limit, activeCount: activeCheck.activeCount });
        setIsCampaignsLimitModalOpen(true);
        return;
      }
    }

    // Plan validation 2: Unique groups limit
    const reservedGroups = planService.getUniqueGroupJidsInAutomations(campaignsForValidation);
    const combinedUnique = new Set([...reservedGroups, ...selectedGroupJids]);
    if (combinedUnique.size > currentPlan.maxGroups) {
      setGroupLimitData({ limit: currentPlan.maxGroups, used: combinedUnique.size });
      setIsGroupLimitModalOpen(true);
      return;
    }

    // Plan validation 3: Monthly sends limit if immediate dispatch
    if (sendImmediately || scheduleMode === 'imediato') {
      const sendCheck = planService.canSendMessages(campaignsForValidation, selectedGroupJids.length);
      if (!sendCheck.allowed) {
        setMonthlySendsData({ limit: sendCheck.limit, used: sendCheck.used });
        setIsMonthlySendsModalOpen(true);
        return;
      }
    }

    setSaving(true);

    const formattedStartDate = startDate
      ? `${startDate.split('-')[2]}/${startDate.split('-')[1]}/${startDate.split('-')[0]}`
      : 'Hoje';

    let scheduleDaysText = 'Todos os dias';
    if (sendImmediately || scheduleMode === 'imediato') {
      scheduleDaysText = 'Envio Imediato';
    } else if (scheduleMode === 'recorrente') {
      scheduleDaysText = selectedDays.join(', ') || 'Dias selecionados';
    } else {
      scheduleDaysText = formattedStartDate;
    }

    const firstImage = mediaList.find((m) => m.type === 'image')?.url;

    const selectedTimes = scheduleMode === 'recorrente' ? scheduleTimes : [startTime];
    const newCampaign: DivulgacaoCard = {
      id: editingCampaign?.id || `div-${Date.now()}`,
      title: title.trim(),
      category,
      active: activateNow,
      status: activateNow ? (sendImmediately || scheduleMode === 'imediato' ? 'enviando' : (scheduleMode === 'agendar' ? 'agendada' : 'ativa')) : 'pausada',
      scheduleDays: scheduleDaysText,
      scheduleTime: sendImmediately || scheduleMode === 'imediato' ? 'Agora' : selectedTimes[0],
      scheduleTimes: selectedTimes,
      scheduleDate: startDate,
      scheduleDateText: formattedStartDate,
      intervalText: delaySeconds < 60 ? `A cada ${delaySeconds}s` : `A cada ${intervalMinutes} min`,
      intervalMinutes,
      delaySeconds,
      dailyLimit,
      scheduleMode: sendImmediately ? 'imediato' : scheduleMode,
      groupsCount: selectedGroupJids.length,
      groupsMembersCount: totalMembersSelected,
      selectedGroupJids,
      totalSent: editingCampaign?.totalSent || 0,
      totalFailed: editingCampaign?.totalFailed || 0,
      totalTarget: selectedGroupJids.length,
      imageUrl: firstImage,
      mediaList,
      sendAsAlbum,
      addCaptionToMedia,
      previewText: messageText.trim(),
      mediaType: mediaList.length > 0 ? (mediaList[0].type === 'image' ? 'imagem' : 'video') : 'texto',
      tags: [category.split(' ')[0]],
      createdAt: editingCampaign?.createdAt || new Date().toISOString(),
      executed: false,
    };

    // Save to real backend
    try {
      const payload = {
        id: newCampaign.id,
        title: newCampaign.title,
        category: newCampaign.category,
        scheduleMode: newCampaign.scheduleMode,
        scheduleDate: startDate,
        scheduleDays: scheduleDaysText,
        scheduleDateText: formattedStartDate,
        scheduleTime: sendImmediately || scheduleMode === 'imediato' ? 'Agora' : selectedTimes[0],
        scheduleTimes: selectedTimes,
        intervalMinutes,
        delaySeconds,
        dailyLimit,
        previewText: newCampaign.previewText,
        imageUrl: firstImage,
        mediaList: newCampaign.mediaList,
        selectedGroupJids,
        groupsCount: selectedGroupJids.length,
        active: activateNow,
        sendAsAlbum,
        addCaptionToMedia,
      };

      const created = editingCampaign
        ? await clientService.updateCampaign(editingCampaign.id, payload)
        : await clientService.createCampaign(payload);

      if (!created) {
        throw new Error('Não foi possível salvar a divulgação no banco de dados.');
      }

      // Só dispara imediatamente quando o usuário escolher envio imediato.
      if (sendImmediately || scheduleMode === 'imediato') {
        const dispatchRes = await clientService.dispatchNow({
          campaignId: created?.id || newCampaign.id,
          customGroupJids: selectedGroupJids,
          customMessage: newCampaign.previewText,
          imageUrl: created?.imageUrl || firstImage,
          intervalSeconds: delaySeconds,
        });

        if (dispatchRes.success) {
          created.status = 'concluida';
          created.totalSent = dispatchRes.successful !== undefined ? dispatchRes.successful : selectedGroupJids.length;
        }
      }

      onSaveCampaign(created || newCampaign, true);
      setSaving(false);
      onBack();
    } catch (e: any) {
      console.error('Error saving campaign:', e);
      setValidationError(e?.message || 'Falha ao salvar a divulgação. Verifique os dados e tente novamente.');
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const stepsList = [
    { num: 1, label: 'Mensagem & Mídia' },
    { num: 2, label: 'Grupos de Destino' },
    { num: 3, label: 'Programação' },
    { num: 4, label: 'Revisar & Confirmar' },
  ];

  return (
    <div className="flex-1 flex flex-col gap-5 max-w-5xl mx-auto w-full pb-16 font-sans">
      {editingCampaign && (
        <div className="px-4 py-3 rounded-2xl bg-[#eaf6ef] border border-[#c4e6ce] text-[#0b6e3d] text-sm font-bold">
          Editando: {editingCampaign.title}
        </div>
      )}
      {/* 1. TOP BAR: Back Navigation + Step Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#e5ebe7] shadow-xs">
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#2d4036] hover:text-[#109353] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft size={18} />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={() => handleFinalSubmit(false, false)}
            disabled={saving}
            className="px-4 py-2.5 bg-white border border-[#d5ded8] hover:bg-[#f5f8f6] text-[#34483e] text-xs sm:text-sm font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-2"
          >
            <Bookmark size={16} />
            <span>Salvar Rascunho</span>
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>Continuar</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => handleFinalSubmit(true, scheduleMode === 'imediato')}
              disabled={saving}
              className="px-6 py-2.5 bg-[#0e8048] hover:bg-[#0b6a3b] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              {scheduleMode === 'imediato' ? <Zap size={16} /> : <CheckCircle2 size={16} />}
              <span>
                {saving
                  ? 'Processando...'
                  : scheduleMode === 'imediato'
                  ? 'Finalizar e Disparar'
                  : scheduleMode === 'recorrente'
                  ? 'Ativar Programação'
                  : 'Confirmar Agendamento'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PROGRESS STEPPER (Responsive) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e5ebe7] shadow-xs">
        <div className="flex items-center justify-between relative">
          {stepsList.map((step, idx) => {
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <React.Fragment key={step.num}>
                <div
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num);
                  }}
                  className={`flex flex-col sm:flex-row items-center gap-2 cursor-pointer z-10 ${
                    step.num < currentStep ? 'opacity-90' : ''
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs sm:text-sm transition-all shadow-xs ${
                      isDone
                        ? 'bg-[#109353] text-white'
                        : isCurrent
                        ? 'bg-[#11241c] text-white ring-4 ring-[#e5f5ed]'
                        : 'bg-[#f0f4f1] text-[#718479]'
                    }`}
                  >
                    {isDone ? <Check size={18} className="stroke-[3]" /> : step.num}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold text-center sm:text-left ${
                      isCurrent
                        ? 'text-[#11241c]'
                        : isDone
                        ? 'text-[#109353]'
                        : 'text-[#819489] hidden sm:inline'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      currentStep > idx + 1 ? 'bg-[#109353]' : 'bg-[#e5ece8]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* VALIDATION ERROR BANNER */}
      {validationError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 1: MENSAGEM & MÍDIA */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Form Left (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
            <div className="flex flex-col gap-1 border-b border-[#f0f4f1] pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#11241c]">
                Informações da Divulgação
              </h2>
              <p className="text-xs text-[#5d7165]">
                Preencha o conteúdo da mensagem que será disparada nos grupos de WhatsApp.
              </p>
            </div>

            {/* Title Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#2d4036] flex items-center justify-between">
                <span>Título / Identificação da Campanha *</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Oferta Especial de Quinta-feira"
                className="w-full px-4 py-3 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] focus:bg-white rounded-2xl text-sm font-medium text-[#11241c] outline-none transition-all"
              />
            </div>

            {/* Category Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#2d4036]">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] focus:bg-white rounded-2xl text-sm font-semibold text-[#11241c] outline-none transition-all"
              >
                <option value="Vendas & Ofertas">Vendas & Ofertas</option>
                <option value="Divulgação Local">Divulgação Local</option>
                <option value="Serviços">Serviços</option>
                <option value="Gastronomia">Gastronomia</option>
                <option value="Negócios">Negócios & Networking</option>
                <option value="Novidades">Lançamentos & Novidades</option>
                <option value="Geral">Geral</option>
              </select>
            </div>

            {/* Message Text Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2d4036]">
                  Texto da Mensagem *
                </label>
                <span className="text-[11px] text-[#718479] font-medium">
                  {messageText.length} caracteres
                </span>
              </div>
              <textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Digite aqui o texto da sua mensagem que será enviada para os grupos..."
                className="w-full p-4 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] focus:bg-white rounded-2xl text-sm font-medium text-[#11241c] outline-none transition-all resize-y leading-relaxed"
              />
            </div>

            {/* Media Upload Section */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-[#f0f4f1]">
              <label className="text-xs font-bold text-[#2d4036] flex items-center justify-between">
                <span>Foto ou Vídeo (Opcional)</span>
                <span className="text-[11px] text-[#718479]">JPG, PNG ou MP4</span>
              </label>

              {/* Upload Drop Area */}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#cfdbd4] hover:border-[#109353] hover:bg-[#f5faf7] rounded-2xl cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const isImg = file.type.startsWith('image');
                      handleAddMedia(isImg ? 'image' : 'video', file);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-11 h-11 rounded-2xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center mb-2">
                  <Upload size={20} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#11241c]">
                  Clique para anexar arquivo
                </span>
                <span className="text-[11px] text-[#677b70] mt-0.5">
                  Ou arraste uma foto ou vídeo para cá
                </span>
              </label>

              {/* Media Previews List */}
              {mediaList.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {mediaList.map((m) => (
                    <div
                      key={m.id}
                      className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-[#dbe4df] shadow-2xs"
                    >
                      {m.type === 'image' ? (
                        <img
                          src={m.url}
                          alt="Anexo"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#11241c] text-white flex flex-col items-center justify-center gap-1">
                          <Video size={20} />
                          <span className="text-[9px] font-bold uppercase">Vídeo</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveMedia(m.id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Balloon Live Preview Right (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 bg-[#e4ddd4] p-4 sm:p-5 rounded-3xl border border-[#d4cbbf] shadow-xs sticky top-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/10">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-[#128c7e]" />
                <span className="text-xs font-bold text-[#11241c]">
                  Prévia no WhatsApp
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#5c6e64]">
                Exibição no Grupo
              </span>
            </div>

            {/* Bubble Container */}
            <div className="bg-[#e7fedb] rounded-2xl p-3 sm:p-3.5 shadow-sm border border-[#c3ebce] flex flex-col gap-2 relative max-w-sm ml-auto">
              {/* Image in bubble if attached */}
              {mediaList.length > 0 && mediaList[0].type === 'image' && (
                <div className="rounded-xl overflow-hidden border border-black/5 bg-black/5">
                  <img
                    src={mediaList[0].url}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full max-h-48 object-cover"
                  />
                </div>
              )}

              {/* Message text formatted */}
              <div className="text-xs sm:text-[13px] text-[#111b21] whitespace-pre-wrap leading-relaxed">
                {messageText || (
                  <span className="text-gray-400 italic">
                    Sua mensagem aparecerá aqui conforme você digita...
                  </span>
                )}
              </div>

              {/* Timestamp & checks */}
              <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] self-end mt-0.5">
                <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-[#53bdeb]">✓✓</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 2: SELECIONAR GRUPOS DE DESTINO */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4f1] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#11241c]">
                Selecionar Grupos de Destino
              </h2>
              <p className="text-xs text-[#5d7165]">
                Escolha os grupos reais conectados ao seu WhatsApp que receberão o disparo.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => fetchRealGroups(true)}
                disabled={loadingGroups}
                className="px-3 py-2 bg-[#f0f4f1] hover:bg-[#e4ede8] text-[#2d4036] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loadingGroups ? 'animate-spin' : ''} />
                <span>Atualizar Grupos</span>
              </button>

              <button
                onClick={handleSelectAll}
                className="px-3.5 py-2 bg-[#109353] hover:bg-[#0e8048] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {selectedGroupJids.length === availableGroups.length && availableGroups.length > 0
                  ? 'Desmarcar Todos'
                  : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          {/* Plan Capacity Indicator Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f7faf8] border border-[#dbe6df] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#11241c]">
                  Capacidade de Grupos do Plano ({currentPlan.name})
                </span>
                <span className="text-[11px] font-bold text-[#109353] bg-[#e6f4ec] px-2 py-0.5 rounded-md">
                  {existingUniqueGroups.size} de {currentPlan.maxGroups} em automações
                </span>
              </div>
              <p className="text-[11px] text-[#5c7164]">
                O limite conta apenas <strong>grupos únicos</strong>. Grupos já presentes em outras divulgações não consomem limite adicional.
              </p>
            </div>
            {onNavigateToPlanos && (
              <button
                type="button"
                onClick={onNavigateToPlanos}
                className="text-xs font-bold text-[#109353] hover:underline cursor-pointer shrink-0"
              >
                Gerenciar Plano →
              </button>
            )}
          </div>

          {/* Search bar & count pill */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#82958a]" />
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Pesquisar grupo pelo nome..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] rounded-2xl text-xs sm:text-sm font-medium outline-none"
              />
            </div>

            <div className="px-3.5 py-2 bg-[#e8f7ee] text-[#109353] rounded-2xl text-xs font-bold flex items-center justify-between sm:justify-start gap-2 shrink-0">
              <Users size={16} />
              <span>
                {selectedGroupJids.length} de {availableGroups.length} selecionados
              </span>
            </div>
          </div>

          {/* Groups List */}
          {loadingGroups ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <RefreshCw size={24} className="animate-spin text-[#109353]" />
              <span className="text-xs text-[#5d7165]">Buscando grupos reais no WhatsApp...</span>
            </div>
          ) : availableGroups.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3 bg-[#fbfdfc] rounded-2xl border border-dashed border-[#d5ded8]">
              <div className="w-12 h-12 rounded-2xl bg-[#ebf7f0] text-[#109353] flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="text-sm font-bold text-[#11241c]">Nenhum grupo encontrado</h3>
                <p className="text-xs text-[#62776c]">
                  Conecte seu WhatsApp com QR Code na aba de conexão para que seus grupos reais sejam listados automaticamente.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fetchRealGroups(true)}
                  disabled={loadingGroups}
                  className="px-4 py-2 bg-[#f0f4f1] hover:bg-[#e4ede8] text-[#2d4036] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={14} className={loadingGroups ? 'animate-spin' : ''} />
                  <span>Sincronizar Grupos Agora</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateToConnection}
                  className="px-4 py-2 bg-[#109353] hover:bg-[#0e8048] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Conectar WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredGroups.map((g) => {
                const jid = g.jid || g.id;
                const isSelected = selectedGroupJids.includes(jid);

                return (
                  <div
                    key={jid}
                    onClick={() => toggleGroupSelection(jid)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#eef8f2] border-[#109353] shadow-xs'
                        : 'bg-[#fafcfb] border-[#e1e9e4] hover:border-[#c2d6cc]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {g.avatarUrl || g.avatar ? (
                        <img
                          src={g.avatarUrl || g.avatar}
                          alt={g.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-black/5"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#e3ece6] text-[#2d4036] flex items-center justify-center font-bold text-xs shrink-0">
                          {g.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[#11241c] truncate">
                            {g.name}
                          </span>
                          {existingUniqueGroups.has(jid) && (
                            <span className="text-[9px] font-bold text-[#109353] bg-[#eef8f2] border border-[#cde5d7] px-1.5 py-0.5 rounded shrink-0">
                              No plano
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#6b7f73]">
                          {g.membersCount ? `${g.membersCount} membros` : 'Grupo WhatsApp'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        isSelected ? 'bg-[#109353] text-white' : 'border border-[#bccbc2]'
                      }`}
                    >
                      {isSelected && <Check size={14} className="stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 3: PROGRAMAÇÃO DO DISPARO */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
          <div className="flex flex-col gap-1 border-b border-[#f0f4f1] pb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#11241c]">
              Programação do Disparo
            </h2>
            <p className="text-xs text-[#5d7165]">
              Defina como e quando sua mensagem será enviada aos grupos.
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setScheduleMode('agendar')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                scheduleMode === 'agendar'
                  ? 'bg-[#edf8f2] border-[#109353] ring-2 ring-[#109353]/20'
                  : 'bg-[#fafcfb] border-[#e1e9e4] hover:bg-[#f4f7f5]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#109353]" />
                <span className="text-xs sm:text-sm font-bold text-[#11241c]">Agendar Data & Hora</span>
              </div>
              <span className="text-[11px] text-[#5e7166]">Disparo único pontual. Conclui após enviar para todos os grupos.</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleMode('recorrente')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                scheduleMode === 'recorrente'
                  ? 'bg-[#edf8f2] border-[#109353] ring-2 ring-[#109353]/20'
                  : 'bg-[#fafcfb] border-[#e1e9e4] hover:bg-[#f4f7f5]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#109353]" />
                <span className="text-xs sm:text-sm font-bold text-[#11241c]">Envio Recorrente</span>
              </div>
              <span className="text-[11px] text-[#5e7166]">Repete automaticamente nos dias e horários selecionados</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleMode('imediato')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                scheduleMode === 'imediato'
                  ? 'bg-[#edf8f2] border-[#109353] ring-2 ring-[#109353]/20'
                  : 'bg-[#fafcfb] border-[#e1e9e4] hover:bg-[#f4f7f5]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-[#109353]" />
                <span className="text-xs sm:text-sm font-bold text-[#11241c]">Disparo Imediato</span>
              </div>
              <span className="text-[11px] text-[#5e7166]">Iniciar envio agora mesmo para os grupos selecionados</span>
            </button>
          </div>

          {/* Mode Details Banner */}
          {scheduleMode === 'agendar' && (
            <div className="p-3.5 bg-[#f0f8f3] border border-[#cbe4d4] rounded-2xl flex items-start gap-2.5 text-xs text-[#1c4b32]">
              <CheckCircle2 size={16} className="text-[#109353] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">Como funciona o Agendamento Pontual:</span>
                <span className="text-[#416350]">
                  O sistema aguardará a data e hora configuradas. Quando disparar, enviará para cada grupo respeitando o intervalo anti-bloqueio. Ao terminar o último grupo, a campanha será marcada como <strong>Concluída (100%)</strong> e encerrará sem repetir.
                </span>
              </div>
            </div>
          )}

          {scheduleMode === 'recorrente' && (
            <div className="p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl flex items-start gap-2.5 text-xs text-[#1e40af]">
              <Clock size={16} className="text-[#2563eb] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">Como funciona o Envio Recorrente:</span>
                <span className="text-[#3b5998]">
                  O robô disparará nos dias da semana ativos e em cada um dos horários programados. Em cada ciclo, percorrerá os grupos com o intervalo configurado.
                </span>
              </div>
            </div>
          )}

          {/* Form Fields according to mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {scheduleMode === 'agendar' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2d4036]">Data do Disparo *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] focus:bg-white rounded-2xl text-sm font-medium text-[#11241c] outline-none"
                />
              </div>
            )}

            {scheduleMode === 'agendar' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2d4036]">Horário de Início *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] focus:bg-white rounded-2xl text-sm font-medium text-[#11241c] outline-none"
                />
              </div>
            )}

            {/* Recurrent Mode: Multiple Time Slots */}
            {scheduleMode === 'recorrente' && (
              <div className="sm:col-span-2 flex flex-col gap-2 p-4 bg-[#fafcfb] border border-[#e2eae5] rounded-2xl">
                <label className="text-xs font-bold text-[#2d4036]">Horários de Disparo no Dia</label>
                <div className="flex flex-wrap items-center gap-2">
                  {scheduleTimes.map((timeSlot) => (
                    <div
                      key={timeSlot}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#109353] rounded-xl text-xs font-bold text-[#109353] shadow-2xs"
                    >
                      <span>{timeSlot}</span>
                      {scheduleTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScheduleTime(timeSlot)}
                          className="text-red-500 hover:text-red-700 font-extrabold text-sm ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="time"
                      value={newTimeInput}
                      onChange={(e) => setNewTimeInput(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-[#d8e2dc] rounded-xl text-xs font-medium text-[#11241c] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddScheduleTime}
                      className="px-3 py-1.5 bg-[#109353] text-white text-xs font-bold rounded-xl hover:bg-[#0e8048] cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recurrent Days Selector */}
            {scheduleMode === 'recorrente' && (
              <div className="sm:col-span-2 flex flex-col gap-2">
                <label className="text-xs font-bold text-[#2d4036]">Dias da Semana</label>
                <div className="flex flex-wrap gap-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#109353] text-white shadow-xs'
                            : 'bg-[#f0f4f1] text-[#4d6054] hover:bg-[#e4ede7]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Anti-Ban Interval Selection */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2d4036] flex items-center gap-1.5">
                  <Clock size={13} className="text-[#109353]" />
                  <span>Intervalo entre Grupos (Anti-Bloqueio Seguro)</span>
                </label>
                <span className="text-xs font-bold text-[#109353] bg-[#eef7f2] px-2.5 py-0.5 rounded-full">
                  {delaySeconds < 60 ? `${delaySeconds} seg` : `${intervalMinutes} min`} entre cada envio
                </span>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { sec: 30, mins: 1, label: '30 seg', badge: 'Rápido' },
                  { sec: 60, mins: 1, label: '1 min', badge: 'Ágil' },
                  { sec: 120, mins: 2, label: '2 min', badge: 'Recomendado', isDefault: true },
                  { sec: 180, mins: 3, label: '3 min', badge: 'Seguro' },
                  { sec: 300, mins: 5, label: '5 min', badge: 'Alta Proteção' },
                  { sec: 600, mins: 10, label: '10 min', badge: 'Espaçado' },
                ].map((opt) => {
                  const isSelected = delaySeconds === opt.sec;
                  return (
                    <button
                      key={opt.sec}
                      type="button"
                      onClick={() => {
                        setDelaySeconds(opt.sec);
                        setIntervalMinutes(opt.mins);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#eef7f2] border-[#109353] text-[#109353] font-bold shadow-xs'
                          : 'bg-[#fcfdfc] border-[#e2eae5] text-[#3e5348] hover:border-[#b4d2c2]'
                      }`}
                    >
                      <span className="text-sm font-extrabold">{opt.label}</span>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#109353] font-semibold' : 'text-[#7d9186]'}`}>
                        {opt.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Sequential Dispatch Timeline Preview */}
              {selectedGroupJids.length > 0 && (
                <div className="mt-2 p-3.5 rounded-2xl bg-[#f7faf8] border border-[#e2eae5] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#11241c] flex items-center gap-1.5">
                      <Clock size={12} className="text-[#109353]" />
                      Cronograma Sequencial de Envio:
                    </span>
                    <span className="text-[11px] font-semibold text-[#667a6f]">
                      {selectedGroupJids.length} {selectedGroupJids.length === 1 ? 'grupo' : 'grupos'} selecionados
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    {calculateSequentialTimes().map((item) => (
                      <div
                        key={item.index}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-[#edf3f0]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#109353] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.index}
                          </span>
                          <span className="font-semibold text-[#192c22] truncate max-w-[180px] sm:max-w-[280px]">
                            {item.groupName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-[11px] text-[#71857a] hidden sm:inline">
                            {item.intervalOffset}
                          </span>
                          <span className="font-mono font-bold text-[#109353] bg-[#eef7f2] px-2 py-0.5 rounded text-[11px]">
                            {item.time}
                          </span>
                        </div>
                      </div>
                    ))}

                    {selectedGroupJids.length > 5 && (
                      <span className="text-[11px] text-center text-[#71857a] italic mt-0.5">
                        + {selectedGroupJids.length - 5} grupos adicionais enviados a cada {delaySeconds < 60 ? `${delaySeconds}s` : `${intervalMinutes}min`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Limit */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#2d4036]">Limite Diário de Envios</label>
              <select
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full px-4 py-3 bg-[#f8faf9] border border-[#dce5e0] focus:border-[#109353] focus:bg-white rounded-2xl text-sm font-semibold text-[#11241c] outline-none"
              >
                <option value="Sem limite">Sem limite</option>
                <option value="50 grupos / dia">Máximo 50 grupos / dia</option>
                <option value="100 grupos / dia">Máximo 100 grupos / dia</option>
                <option value="200 grupos / dia">Máximo 200 grupos / dia</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 4: REVISAR E CONFIRMAR */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <div className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#e5ebe7] shadow-xs">
          <div className="flex flex-col gap-1 border-b border-[#f0f4f1] pb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#11241c]">
              Revisar Detalhes da Divulgação
            </h2>
            <p className="text-xs text-[#5d7165]">
              Confira o cronograma de disparo e todos os parâmetros antes de confirmar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#e5ece8] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#62766a]">Título da Campanha</span>
              <span className="text-sm font-extrabold text-[#11241c]">{title}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#e5ece8] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#62766a]">Categoria</span>
              <span className="text-sm font-extrabold text-[#109353]">{category}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#e5ece8] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#62766a]">Grupos Selecionados</span>
              <span className="text-sm font-extrabold text-[#11241c]">
                {selectedGroupJids.length} {selectedGroupJids.length === 1 ? 'grupo' : 'grupos'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#e5ece8] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#62766a]">Programação</span>
              <span className="text-sm font-extrabold text-[#11241c]">
                {scheduleMode === 'imediato'
                  ? 'Disparo Imediato'
                  : scheduleMode === 'recorrente'
                  ? `Recorrente às ${startTime} (${selectedDays.join(', ')})`
                  : `Agendado para ${startDate} às ${startTime}`}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#e5ece8] flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-[#62766a]">Intervalo entre Grupos (Anti-Bloqueio)</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#109353]">
                  {delaySeconds < 60 ? `A cada ${delaySeconds} segundos` : `A cada ${intervalMinutes} minutos`} entre cada envio
                </span>
                <span className="text-xs text-[#556c5f]">
                  Disparo sequencial individualizado
                </span>
              </div>
            </div>
          </div>

          {/* Sequential Schedule Table in Review */}
          {selectedGroupJids.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#f7faf8] border border-[#e2eae5] flex flex-col gap-2">
              <span className="text-xs font-bold text-[#11241c] flex items-center gap-1.5">
                <Clock size={13} className="text-[#109353]" />
                Cronograma Previsto de Entrega:
              </span>
              <div className="flex flex-col gap-1.5">
                {calculateSequentialTimes().map((item) => (
                  <div
                    key={item.index}
                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-white border border-[#edf3f0]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#109353] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {item.index}
                      </span>
                      <span className="font-semibold text-[#192c22] truncate max-w-[200px] sm:max-w-[320px]">
                        {item.groupName}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#109353] bg-[#eef7f2] px-2.5 py-0.5 rounded text-xs">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Preview Box */}
          <div className="p-4 rounded-2xl bg-[#f9fbf9] border border-[#e5ece8] flex flex-col gap-2">
            <span className="text-[11px] font-bold text-[#62766a]">Texto da Mensagem</span>
            <p className="text-xs sm:text-sm text-[#2d4036] whitespace-pre-wrap leading-relaxed font-mono bg-white p-3.5 rounded-xl border border-[#e2eae5]">
              {messageText}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#f0f4f1]">
            {scheduleMode === 'imediato' ? (
              <button
                onClick={() => handleFinalSubmit(true, true)}
                disabled={saving}
                className="w-full sm:w-auto px-7 py-3.5 bg-[#109353] hover:bg-[#0e8048] text-white text-sm sm:text-base font-extrabold rounded-2xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Zap size={18} />
                <span>{saving ? 'Disparando mensagens...' : 'Finalizar e Disparar Agora'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleFinalSubmit(true, false)}
                disabled={saving}
                className="w-full sm:w-auto px-7 py-3.5 bg-[#109353] hover:bg-[#0e8048] text-white text-sm sm:text-base font-extrabold rounded-2xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2.5"
              >
                <CheckCircle2 size={18} />
                <span>
                  {saving
                    ? 'Salvando...'
                    : scheduleMode === 'recorrente'
                    ? 'Confirmar Programação Recorrente'
                    : 'Confirmar Agendamento'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Entitlement Limit Modals */}
      <GroupLimitModal
        isOpen={isGroupLimitModalOpen}
        onClose={() => setIsGroupLimitModalOpen(false)}
        onUpgrade={() => {
          setIsGroupLimitModalOpen(false);
          onNavigateToPlanos?.();
        }}
        limit={groupLimitData.limit}
        used={groupLimitData.used}
      />

      <CampaignsLimitModal
        isOpen={isCampaignsLimitModalOpen}
        onClose={() => setIsCampaignsLimitModalOpen(false)}
        onUpgrade={() => {
          setIsCampaignsLimitModalOpen(false);
          onNavigateToPlanos?.();
        }}
        limit={campaignsLimitData.limit}
        activeCount={campaignsLimitData.activeCount}
      />

      <MonthlySendsLimitModal
        isOpen={isMonthlySendsModalOpen}
        onClose={() => setIsMonthlySendsModalOpen(false)}
        onUpgrade={() => {
          setIsMonthlySendsModalOpen(false);
          onNavigateToPlanos?.();
        }}
        limit={monthlySendsData.limit}
        used={monthlySendsData.used}
      />

      <DailyRoundsLimitModal
        isOpen={isDailyRoundsModalOpen}
        onClose={() => setIsDailyRoundsModalOpen(false)}
        onUpgrade={() => {
          setIsDailyRoundsModalOpen(false);
          onNavigateToPlanos?.();
        }}
        limit={dailyRoundsData.limit}
        groupName={dailyRoundsData.groupName}
        existingSendTime={dailyRoundsData.existingSendTime}
        alreadySentToday={dailyRoundsData.alreadySentToday}
      />
    </div>
  );
};
