"use client";

import Link from "next/link";
import type { ElementType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FileDown,
  HardHat,
  Home,
  ImagePlus,
  ExternalLink,
  LogOut,
  PackageCheck,
  Pencil,
  Plus,
  UploadCloud,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AppData, Diario, FotoDiario, Material, MembroEquipe, Obra, Producao, RelacionamentoServico, Servico } from "@/lib/types";
import { dataBR, hojeISO, numero, percentual, uuid } from "@/lib/utils";

type Tab = "dashboard" | "obras" | "servicos" | "diarios" | "resumo_diarios" | "cronograma" | "equipe" | "materiais" | "relatorios";

const dadosVazios: AppData = {
  obras: [],
  servicos: [],
  equipe: [],
  diarios: [],
  producoes: [],
  materiais: [],
  fotos: [],
};

const tabs: { id: Tab; label: string; icon: ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "obras", label: "Obras", icon: Building2 },
  { id: "servicos", label: "Serviços", icon: ClipboardList },
  { id: "diarios", label: "Diário de Obra", icon: BookOpen },
  { id: "cronograma", label: "Cronograma Físico", icon: CalendarDays },
  { id: "equipe", label: "Equipe", icon: Users },
];


const rotas: Record<Tab, string> = {
  dashboard: "/dashboard",
  obras: "/obras",
  servicos: "/servicos",
  diarios: "/diario",
  resumo_diarios: "/dashboard",
  cronograma: "/cronograma",
  equipe: "/equipe",
  materiais: "/materiais",
  relatorios: "/relatorios",
};

function campo(form: HTMLFormElement, nome: string) {
  return String(new FormData(form).get(nome) || "").trim();
}

function numeroCampo(form: HTMLFormElement, nome: string) {
  const valor = Number(String(new FormData(form).get(nome) || "0").replace(",", "."));
  return Number.isFinite(valor) ? valor : 0;
}

function soma(nums: number[]) {
  return nums.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

function relacaoInversa(tipo: RelacionamentoServico): RelacionamentoServico {
  if (tipo === "predecessor") return "sucessor";
  if (tipo === "sucessor") return "predecessor";
  return "mesmo_tempo";
}

function textoLista(nomes: string[]) {
  return nomes.length ? nomes.join(", ") : "-";
}

function dataMeioDia(data: string) {
  return new Date(`${data}T12:00:00`);
}

function adicionarDias(data: Date, dias: number) {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function paraISO(data: Date) {
  return data.toISOString().slice(0, 10);
}

function diferencaDias(inicio: Date, fim: Date) {
  return Math.floor((fim.getTime() - inicio.getTime()) / 86400000);
}

function ehFimDeSemana(data: Date) {
  const dia = data.getDay();
  return dia === 0 || dia === 6;
}

function nomeDiaSemana(data: Date) {
  return ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][data.getDay()];
}

function proximoDiaUtil(data: Date) {
  const nova = new Date(data);
  while (ehFimDeSemana(nova)) nova.setDate(nova.getDate() + 1);
  return nova;
}

function diaUtilSeguinte(data: Date) {
  const nova = adicionarDias(data, 1);
  return proximoDiaUtil(nova);
}

function adicionarDiasUteis(data: Date, diasUteis: number) {
  const total = Math.max(Math.round(diasUteis), 1);
  const nova = proximoDiaUtil(data);
  let contados = 1;
  while (contados < total) {
    nova.setDate(nova.getDate() + 1);
    if (!ehFimDeSemana(nova)) contados += 1;
  }
  return nova;
}

function contarDiasUteisInclusivo(inicio: Date, fim: Date) {
  if (fim < inicio) return 0;
  const cursor = new Date(inicio);
  let total = 0;
  while (cursor <= fim) {
    if (!ehFimDeSemana(cursor)) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

function textoSemTrabalho(dataISO: string) {
  const data = dataMeioDia(dataISO || hojeISO());
  if (data.getDay() === 6) return "Sábado sem trabalho";
  if (data.getDay() === 0) return "Domingo sem trabalho";
  return "Dia sem trabalho";
}

function contarPessoasEquipe(modo: "completa" | "incompleta", equipeTexto: string | null, equipeObra: MembroEquipe[]) {
  if (modo === "completa") return Math.max(equipeObra.filter((membro) => membro.ativo !== false).length, 1);
  const nomes = String(equipeTexto || "")
    .split(/[;,\n]+/)
    .map((nome) => nome.trim())
    .filter(Boolean);
  return Math.max(nomes.length, 1);
}

function calcularHorasTrabalhadas(inicio: string | null, termino: string | null) {
  if (!inicio || !termino) return 8;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = termino.split(":").map(Number);
  if (!Number.isFinite(hi) || !Number.isFinite(mi) || !Number.isFinite(hf) || !Number.isFinite(mf)) return 8;
  const minutosInicio = hi * 60 + mi;
  const minutosFim = hf * 60 + mf;
  const diferenca = minutosFim - minutosInicio;
  return diferenca > 0 ? diferenca / 60 : 8;
}

export default function ControleObraApp({ paginaInicial = "dashboard" }: { paginaInicial?: Tab } = {}) {
  const [active, setActive] = useState<Tab>(paginaInicial);
  const [data, setData] = useState<AppData>(dadosVazios);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [modoRemoto, setModoRemoto] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [equipePresenteModo, setEquipePresenteModo] = useState<"completa" | "incompleta">("completa");
  const [equipeIncompletaTexto, setEquipeIncompletaTexto] = useState("");
  const [dataDiarioSelecionada, setDataDiarioSelecionada] = useState(hojeISO());
  const [horarioInicioDiario, setHorarioInicioDiario] = useState("07:00");
  const [horarioTerminoDiario, setHorarioTerminoDiario] = useState("17:00");
  const [diarioSemTrabalho, setDiarioSemTrabalho] = useState(false);
  const [motivoSemTrabalho, setMotivoSemTrabalho] = useState("");
  const [servicoDiarioId, setServicoDiarioId] = useState("");
  const [percentualExecucaoDiario, setPercentualExecucaoDiario] = useState("");
  const [quantidadeExecucaoDiario, setQuantidadeExecucaoDiario] = useState("");
  const [producaoData, setProducaoData] = useState(hojeISO());
  const [producaoDiarioId, setProducaoDiarioId] = useState("");
  const [servicoProducaoId, setServicoProducaoId] = useState("");
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [obraEditando, setObraEditando] = useState<Obra | null>(null);
  const [mostrarNovoDiario, setMostrarNovoDiario] = useState(false);
  const [mostrarProdutividade, setMostrarProdutividade] = useState(false);
  const [mostrarDiariosLancados, setMostrarDiariosLancados] = useState(false);
  const [mostrarServicosConcluidos, setMostrarServicosConcluidos] = useState(false);

  useEffect(() => {
    setActive(paginaInicial);
  }, [paginaInicial]);

  const obraSelecionada = data.obras.find((obra) => obra.id === selectedObraId) || data.obras[0];
  const obraId = obraSelecionada?.id || "";
  const dataDiarioObj = dataMeioDia(dataDiarioSelecionada || hojeISO());
  const diarioFimDeSemana = ehFimDeSemana(dataDiarioObj);
  const rotuloDiaSemTrabalho = textoSemTrabalho(dataDiarioSelecionada);
  const diarioTrabalhado = !diarioSemTrabalho;

  const servicosObra = useMemo(() => data.servicos.filter((s) => s.obra_id === obraId), [data.servicos, obraId]);
  const equipeObra = useMemo(() => data.equipe.filter((e) => e.obra_id === obraId), [data.equipe, obraId]);
  const diariosObra = useMemo(
    () => data.diarios.filter((d) => d.obra_id === obraId).sort((a, b) => b.data.localeCompare(a.data)),
    [data.diarios, obraId]
  );
  const producoesObra = useMemo(() => data.producoes.filter((p) => p.obra_id === obraId), [data.producoes, obraId]);
  const diariosDisponiveisProducao = useMemo(() => {
    const diariosJaVinculados = new Set(
      producoesObra
        .map((producao) => producao.diario_id)
        .filter((diarioId): diarioId is string => Boolean(diarioId))
    );

    return diariosObra.filter((diario) => {
      const semTrabalho = /sem trabalho/i.test(String(diario.equipe_resumo || "")) || /sem trabalho/i.test(String(diario.servicos_executados || ""));
      return !diariosJaVinculados.has(diario.id) && !semTrabalho;
    });
  }, [diariosObra, producoesObra]);

  const materiaisObra = useMemo(
    () => data.materiais.filter((m) => m.obra_id === obraId).sort((a, b) => b.data.localeCompare(a.data)),
    [data.materiais, obraId]
  );

  const fotosObra = useMemo(() => {
    const idsDiarios = new Set(diariosObra.map((d) => d.id));
    return data.fotos.filter((foto) => idsDiarios.has(foto.diario_id));
  }, [data.fotos, diariosObra]);

  const producoesPeriodo = useMemo(() => {
    return producoesObra.filter((p) => {
      if (periodoInicio && p.data < periodoInicio) return false;
      if (periodoFim && p.data > periodoFim) return false;
      return true;
    });
  }, [producoesObra, periodoInicio, periodoFim]);

  const avancos = useMemo(() => {
    return servicosObra.map((servico) => {
      const producoesDoServico = producoesObra.filter((p) => p.servico_id === servico.id);
      const executado = soma(producoesDoServico.map((p) => p.quantidade));
      const diasExecutados = new Set(producoesDoServico.map((p) => p.data)).size;
      const avanco = servico.qtd_prevista > 0 ? (executado / servico.qtd_prevista) * 100 : 0;
      return { servico, executado, falta: Math.max(servico.qtd_prevista - executado, 0), avanco, diasExecutados };
    });
  }, [servicosObra, producoesObra]);

  const avancoGeral = useMemo(() => {
    if (!avancos.length) return 0;
    return soma(avancos.map((a) => Math.min(a.avanco, 100))) / avancos.length;
  }, [avancos]);

  const cronogramaFisico = useMemo(() => {
    if (!obraSelecionada?.data_inicio) return [];
    const inicioCalendarioObra = dataMeioDia(obraSelecionada.data_inicio);
    const inicioObra = proximoDiaUtil(inicioCalendarioObra);
    const hoje = dataMeioDia(hojeISO());
    const servicosOrdenados = [...servicosObra].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

    const parent = new Map<string, string>();
    servicosOrdenados.forEach((servico) => parent.set(servico.id, servico.id));

    const find = (id: string): string => {
      const atual = parent.get(id) || id;
      if (atual === id) return id;
      const raiz = find(atual);
      parent.set(id, raiz);
      return raiz;
    };

    const unir = (a: string, b: string) => {
      const raizA = find(a);
      const raizB = find(b);
      if (raizA !== raizB) parent.set(raizB, raizA);
    };

    servicosOrdenados.forEach((servico) => {
      if (servico.relacionamento_tipo === "mesmo_tempo" && servico.servico_relacionado_id && parent.has(servico.servico_relacionado_id)) {
        unir(servico.id, servico.servico_relacionado_id);
      }
    });

    const grupos = new Map<string, { id: string; servicos: Servico[]; ordem: number }>();
    servicosOrdenados.forEach((servico, index) => {
      const grupoId = find(servico.id);
      const grupo = grupos.get(grupoId) || { id: grupoId, servicos: [], ordem: index };
      grupo.servicos.push(servico);
      grupo.ordem = Math.min(grupo.ordem, index);
      grupos.set(grupoId, grupo);
    });

    const grupoDoServico = (id: string) => find(id);
    const sucessores = new Map<string, Set<string>>();
    const predecessores = new Map<string, Set<string>>();
    grupos.forEach((grupo) => {
      sucessores.set(grupo.id, new Set());
      predecessores.set(grupo.id, new Set());
    });

    const adicionarDependencia = (predecessorId: string, sucessorId: string) => {
      const grupoPredecessor = grupoDoServico(predecessorId);
      const grupoSucessor = grupoDoServico(sucessorId);
      if (grupoPredecessor === grupoSucessor) return;
      sucessores.get(grupoPredecessor)?.add(grupoSucessor);
      predecessores.get(grupoSucessor)?.add(grupoPredecessor);
    };

    servicosOrdenados.forEach((servico) => {
      if (!servico.relacionamento_tipo || !servico.servico_relacionado_id || !parent.has(servico.servico_relacionado_id)) return;
      if (servico.relacionamento_tipo === "predecessor") adicionarDependencia(servico.id, servico.servico_relacionado_id);
      if (servico.relacionamento_tipo === "sucessor") adicionarDependencia(servico.servico_relacionado_id, servico.id);
    });

    const gruposOrdenados = [...grupos.values()].sort((a, b) => a.ordem - b.ordem);
    const duracaoGrupo = (grupo: { servicos: Servico[] }) => Math.max(...grupo.servicos.map((servico) => Math.max(Number(servico.dias_previstos || 1), 1)));
    const agenda = new Map<string, { inicio: Date; fim: Date; inicioOffset: number; fimOffset: number }>();
    const pendentes = new Set(gruposOrdenados.map((grupo) => grupo.id));
    let cursor = new Date(inicioObra);

    while (pendentes.size > 0) {
      let evoluiu = false;

      for (const grupo of gruposOrdenados) {
        if (!pendentes.has(grupo.id)) continue;
        const preds = [...(predecessores.get(grupo.id) || new Set<string>())];
        if (!preds.every((pred) => agenda.has(pred))) continue;

        let inicioPrevistoGrupo = new Date(cursor);
        preds.forEach((pred) => {
          const ag = agenda.get(pred);
          if (ag) {
            const proximo = diaUtilSeguinte(ag.fim);
            if (proximo > inicioPrevistoGrupo) inicioPrevistoGrupo = proximo;
          }
        });
        inicioPrevistoGrupo = proximoDiaUtil(inicioPrevistoGrupo);

        const fimPrevistoGrupo = adicionarDiasUteis(inicioPrevistoGrupo, duracaoGrupo(grupo));
        agenda.set(grupo.id, {
          inicio: inicioPrevistoGrupo,
          fim: fimPrevistoGrupo,
          inicioOffset: diferencaDias(inicioCalendarioObra, inicioPrevistoGrupo),
          fimOffset: diferencaDias(inicioCalendarioObra, fimPrevistoGrupo),
        });
        pendentes.delete(grupo.id);
        const proximoCursor = diaUtilSeguinte(fimPrevistoGrupo);
        if (proximoCursor > cursor) cursor = proximoCursor;
        evoluiu = true;
      }

      if (!evoluiu) {
        const grupo = gruposOrdenados.find((item) => pendentes.has(item.id));
        if (!grupo) break;
        const inicioPrevistoGrupo = proximoDiaUtil(cursor);
        const fimPrevistoGrupo = adicionarDiasUteis(inicioPrevistoGrupo, duracaoGrupo(grupo));
        agenda.set(grupo.id, {
          inicio: inicioPrevistoGrupo,
          fim: fimPrevistoGrupo,
          inicioOffset: diferencaDias(inicioCalendarioObra, inicioPrevistoGrupo),
          fimOffset: diferencaDias(inicioCalendarioObra, fimPrevistoGrupo),
        });
        pendentes.delete(grupo.id);
        cursor = diaUtilSeguinte(fimPrevistoGrupo);
      }
    }

    return servicosOrdenados.map((servico) => {
      const diasPrevistos = Math.max(Number(servico.dias_previstos || 1), 1);
      const agendaGrupo = agenda.get(grupoDoServico(servico.id)) || {
        inicio: inicioObra,
        fim: adicionarDiasUteis(inicioObra, diasPrevistos),
        inicioOffset: diferencaDias(inicioCalendarioObra, inicioObra),
        fimOffset: diferencaDias(inicioCalendarioObra, adicionarDiasUteis(inicioObra, diasPrevistos)),
      };
      const inicioPrevisto = agendaGrupo.inicio;
      const fimPrevisto = adicionarDiasUteis(inicioPrevisto, diasPrevistos);

      const avancoReal = avancos.find((a) => a.servico.id === servico.id)?.avanco || 0;
      const diasUteisDecorridos = hoje < inicioPrevisto ? 0 : contarDiasUteisInclusivo(inicioPrevisto, hoje);
      const avancoPrevisto = Math.min(Math.max((diasUteisDecorridos / diasPrevistos) * 100, 0), 100);
      const diferenca = avancoReal - avancoPrevisto;
      const situacao = avancoReal >= 100
        ? "Concluído"
        : diferenca < -5
          ? "Atrasado"
          : diferenca > 5
            ? "Adiantado"
            : "No prazo";

      return {
        servico,
        diasPrevistos,
        diasExecutados: avancos.find((a) => a.servico.id === servico.id)?.diasExecutados || 0,
        inicioOffset: agendaGrupo.inicioOffset,
        fimOffset: diferencaDias(inicioCalendarioObra, fimPrevisto),
        inicioPrevisto: paraISO(inicioPrevisto),
        fimPrevisto: paraISO(fimPrevisto),
        relacao: descricaoRelacaoServico(servico),
        avancoPrevisto,
        avancoReal,
        diferenca,
        situacao,
      };
    });
  }, [obraSelecionada?.data_inicio, servicosObra, avancos]);

  const avancosOrdenadosCronograma = useMemo(() => {
    const ordem = new Map(cronogramaFisico.map((item, index) => [item.servico.id, index]));
    return [...avancos].sort((a, b) => (ordem.get(a.servico.id) ?? 9999) - (ordem.get(b.servico.id) ?? 9999));
  }, [avancos, cronogramaFisico]);

  const servicosEmAndamentoDiario = useMemo(() => {
    return avancosOrdenadosCronograma.filter((item) => item.avanco < 100);
  }, [avancosOrdenadosCronograma]);

  const servicosConcluidosDiario = useMemo(() => {
    return avancosOrdenadosCronograma.filter((item) => item.avanco >= 100);
  }, [avancosOrdenadosCronograma]);

  const servicoPrevistoDiario = useMemo(() => {
    const dataAlvo = dataMeioDia(dataDiarioSelecionada || hojeISO());
    const servicosNaData = cronogramaFisico.filter((item) => {
      const inicio = dataMeioDia(item.inicioPrevisto);
      const fim = dataMeioDia(item.fimPrevisto);
      return dataAlvo >= inicio && dataAlvo <= fim;
    });

    const servicoPendenteNaData = servicosNaData.find((item) => item.avancoReal < 100);
    if (servicoPendenteNaData) return servicoPendenteNaData.servico.id;

    const indiceReferencia = servicosNaData.length
      ? cronogramaFisico.findIndex((item) => item.servico.id === servicosNaData[servicosNaData.length - 1].servico.id)
      : -1;

    const proximoPendente = cronogramaFisico
      .slice(Math.max(indiceReferencia + 1, 0))
      .find((item) => item.avancoReal < 100);

    return proximoPendente?.servico.id || cronogramaFisico.find((item) => item.avancoReal < 100)?.servico.id || servicosObra[0]?.id || "";
  }, [cronogramaFisico, dataDiarioSelecionada, servicosObra]);

  useEffect(() => {
    setServicoDiarioId(servicoPrevistoDiario);
  }, [servicoPrevistoDiario]);

  const pessoasDiarioAutomatico = useMemo(() => {
    if (diarioSemTrabalho) return 0;
    return contarPessoasEquipe(equipePresenteModo, equipeIncompletaTexto, equipeObra);
  }, [diarioSemTrabalho, equipePresenteModo, equipeIncompletaTexto, equipeObra]);

  const horasDiarioAutomatico = useMemo(() => {
    if (diarioSemTrabalho) return 0;
    return calcularHorasTrabalhadas(horarioInicioDiario, horarioTerminoDiario);
  }, [diarioSemTrabalho, horarioInicioDiario, horarioTerminoDiario]);

  const avancoServicoDiario = useMemo(() => {
    return avancos.find((item) => item.servico.id === servicoDiarioId)?.avanco || 0;
  }, [avancos, servicoDiarioId]);

  const executadoAtualServicoDiario = useMemo(() => {
    return avancos.find((item) => item.servico.id === servicoDiarioId)?.executado || 0;
  }, [avancos, servicoDiarioId]);

  const servicoSelecionadoDiario = useMemo(() => {
    return servicosObra.find((servico) => servico.id === servicoDiarioId) || null;
  }, [servicosObra, servicoDiarioId]);

  const quantidadePrevistaServicoDiario = servicoSelecionadoDiario?.qtd_prevista || 0;
  const unidadeServicoDiario = servicoSelecionadoDiario?.unidade || "";
  const faltaAtualServicoDiario = Math.max(quantidadePrevistaServicoDiario - executadoAtualServicoDiario, 0);
  const quantidadeLancamentoDiarioPreview = numeroDigitado(quantidadeExecucaoDiario)
    || (numeroDigitado(percentualExecucaoDiario) > 0 && quantidadePrevistaServicoDiario > 0
      ? (quantidadePrevistaServicoDiario * numeroDigitado(percentualExecucaoDiario)) / 100
      : 0);
  const executadoTotalAposLancamentoDiario = executadoAtualServicoDiario + quantidadeLancamentoDiarioPreview;
  const faltaAposLancamentoDiario = Math.max(quantidadePrevistaServicoDiario - executadoTotalAposLancamentoDiario, 0);
  const avancoAposLancamentoDiario = quantidadePrevistaServicoDiario > 0
    ? (executadoTotalAposLancamentoDiario / quantidadePrevistaServicoDiario) * 100
    : 0;

  function numeroDigitado(valor: string) {
    const texto = String(valor || "").trim().replace(",", ".");
    if (!texto) return 0;
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatarNumeroInput(valor: number) {
    if (!Number.isFinite(valor)) return "";
    const arredondado = Math.round(valor * 10000) / 10000;
    const texto = String(arredondado);
    if (!texto.includes(".")) return texto;
    return texto.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function atualizarPercentualExecucaoDiario(valor: string) {
    setPercentualExecucaoDiario(valor);
    if (!valor.trim()) {
      setQuantidadeExecucaoDiario("");
      return;
    }
    const percentualValor = numeroDigitado(valor);
    if (quantidadePrevistaServicoDiario > 0) {
      setQuantidadeExecucaoDiario(formatarNumeroInput((quantidadePrevistaServicoDiario * percentualValor) / 100));
    }
  }

  function atualizarQuantidadeExecucaoDiario(valor: string) {
    setQuantidadeExecucaoDiario(valor);
    if (!valor.trim()) {
      setPercentualExecucaoDiario("");
      return;
    }
    const quantidadeValor = numeroDigitado(valor);
    if (quantidadePrevistaServicoDiario > 0) {
      setPercentualExecucaoDiario(formatarNumeroInput((quantidadeValor / quantidadePrevistaServicoDiario) * 100));
    }
  }

  useEffect(() => {
    setPercentualExecucaoDiario("");
    setQuantidadeExecucaoDiario("");
  }, [servicoDiarioId]);

  const servicoPrevistoProducao = useMemo(() => {
    const dataAlvo = dataMeioDia(producaoData || hojeISO());
    const servicosNaData = cronogramaFisico.filter((item) => {
      const inicio = dataMeioDia(item.inicioPrevisto);
      const fim = dataMeioDia(item.fimPrevisto);
      return dataAlvo >= inicio && dataAlvo <= fim;
    });

    const servicoPendente = servicosNaData.find((item) => item.avancoReal < 100);
    return servicoPendente?.servico.id || servicosNaData[0]?.servico.id || servicosObra[0]?.id || "";
  }, [cronogramaFisico, producaoData, servicosObra]);

  useEffect(() => {
    setServicoProducaoId(servicoPrevistoProducao);
  }, [servicoPrevistoProducao]);

  const pessoasProducao = useMemo(() => {
    const diario = diariosObra.find((item) => item.id === producaoDiarioId);
    if (!diario) return 1;
    const resumo = String(diario.equipe_resumo || "").trim();
    if (!resumo) return 1;
    if (/sem trabalho/i.test(resumo)) return 0;
    if (/equipe completa/i.test(resumo)) return Math.max(equipeObra.filter((membro) => membro.ativo !== false).length, 1);
    const nomes = resumo
      .split(/[;,\n]+/)
      .map((nome) => nome.trim())
      .filter(Boolean);
    return Math.max(nomes.length, 1);
  }, [diariosObra, producaoDiarioId, equipeObra]);

  const avancoServicoProducao = useMemo(() => {
    return avancos.find((item) => item.servico.id === servicoProducaoId)?.avanco || 0;
  }, [avancos, servicoProducaoId]);

  const previstoGeral = useMemo(() => {
    if (!cronogramaFisico.length) return 0;
    return soma(cronogramaFisico.map((item) => item.avancoPrevisto)) / cronogramaFisico.length;
  }, [cronogramaFisico]);

  const produtividadeMedia = useMemo(() => {
    const hh = soma(producoesObra.map((p) => p.pessoas * p.horas));
    const qtd = soma(producoesObra.map((p) => p.quantidade));
    return hh > 0 ? qtd / hh : 0;
  }, [producoesObra]);

  const diasTotalPrevistoObra = useMemo(() => {
    if (!cronogramaFisico.length) return 0;
    return Math.max(...cronogramaFisico.map((item) => item.fimOffset + 1), 0);
  }, [cronogramaFisico]);

  const diasUteisPrevistosObra = useMemo(() => {
    if (!obraSelecionada?.data_inicio || diasTotalPrevistoObra <= 0) return 0;
    const inicio = dataMeioDia(obraSelecionada.data_inicio);
    return Array.from({ length: diasTotalPrevistoObra }, (_, index) => adicionarDias(inicio, index))
      .filter((dataItem) => !ehFimDeSemana(dataItem)).length;
  }, [obraSelecionada?.data_inicio, diasTotalPrevistoObra]);

  const diasEmAndamentoObra = useMemo(() => {
    if (!obraSelecionada?.data_inicio) return 0;
    return Math.max(diferencaDias(dataMeioDia(obraSelecionada.data_inicio), dataMeioDia(hojeISO())) + 1, 0);
  }, [obraSelecionada?.data_inicio]);

  const situacaoPrazoObra = useMemo(() => {
    if (avancoGeral + 5 < previstoGeral) return "Fora do prazo";
    if (avancoGeral > previstoGeral + 5) return "Adiantado";
    return "No prazo";
  }, [avancoGeral, previstoGeral]);

  useEffect(() => {
    async function iniciar() {
      setCarregando(true);
      setEmail("Acesso aberto");

      if (!isSupabaseConfigured || !supabase) {
        setData(dadosVazios);
        setSelectedObraId("");
        setModoRemoto(false);
        setMensagem("Supabase nao configurado. Confira o arquivo .env.local para salvar dados no sistema.");
        setCarregando(false);
        return;
      }

      setModoRemoto(true);
      await carregarRemoto();
      setCarregando(false);
    }
    iniciar();
  }, []);

  async function carregarRemoto() {
    if (!supabase) return;
    const [obras, servicos, equipe, diarios, producoes, materiais, fotos] = await Promise.all([
      supabase.from("obras").select("*").order("created_at", { ascending: false }),
      supabase.from("servicos").select("*").order("created_at", { ascending: false }),
      supabase.from("membros_equipe").select("*").order("nome", { ascending: true }),
      supabase.from("diarios").select("*").order("data", { ascending: false }),
      supabase.from("producoes").select("*").order("data", { ascending: false }),
      supabase.from("materiais").select("*").order("data", { ascending: false }),
      supabase.from("fotos_diario").select("*").order("created_at", { ascending: false }),
    ]);

    const novo: AppData = {
      obras: (obras.data || []) as Obra[],
      servicos: (servicos.data || []) as Servico[],
      equipe: (equipe.data || []) as MembroEquipe[],
      diarios: (diarios.data || []) as Diario[],
      producoes: (producoes.data || []) as Producao[],
      materiais: (materiais.data || []) as Material[],
      fotos: (fotos.data || []) as FotoDiario[],
    };
    setData(novo);
    setSelectedObraId((atual) => novo.obras.some((obra) => obra.id === atual) ? atual : novo.obras[0]?.id || "");
  }

  async function login(formEvent: FormEvent<HTMLFormElement>, modo: "entrar" | "cadastrar") {
    formEvent.preventDefault();
    if (!supabase) {
      setMensagem("Configure o Supabase no arquivo .env.local para usar login real.");
      return;
    }
    const form = formEvent.currentTarget;
    const userEmail = campo(form, "email");
    const password = campo(form, "password");
    const resposta = modo === "entrar"
      ? await supabase.auth.signInWithPassword({ email: userEmail, password })
      : await supabase.auth.signUp({ email: userEmail, password });

    if (resposta.error) {
      setMensagem(resposta.error.message);
      return;
    }

    if (modo === "cadastrar" && !resposta.data.session) {
      setMensagem("Cadastro criado. Se o Supabase pedir confirmacao, confirme o e-mail e depois faca login.");
      form.reset();
      return;
    }

    setEmail(resposta.data.user?.email || userEmail);
    setModoRemoto(true);
    await carregarRemoto();
    setMensagem(modo === "entrar" ? "Login realizado." : "Cadastro criado e login realizado.");
    form.reset();
  }

  async function sair() {
    if (supabase) await supabase.auth.signOut();
    setEmail(null);
    setModoRemoto(false);
    setData(dadosVazios);
    setSelectedObraId("");
    setMensagem("Voce saiu do sistema.");
  }

  async function salvarTabela<T extends { id: string }>(tabela: string, item: T) {
    if (modoRemoto && supabase) {
      const { error } = await supabase.from(tabela).insert(item as any);
      if (error) {
        setMensagem(error.message);
        return false;
      }
      await carregarRemoto();
      setMensagem("Registro salvo com sucesso.");
      return true;
    }
    setMensagem("Supabase nao configurado. Confira o arquivo .env.local para salvar dados no sistema.");
    return false;
  }

  async function salvarObra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const item: Obra = {
      id: uuid(),
      nome: campo(form, "nome"),
      cliente: campo(form, "cliente") || null,
      endereco: campo(form, "endereco") || null,
      responsavel: campo(form, "responsavel") || null,
      data_inicio: campo(form, "data_inicio") || null,
      prazo_dias: numeroCampo(form, "prazo_dias") || null,
      status: campo(form, "status") as Obra["status"],
    };
    if (!item.nome) return setMensagem("Informe o nome da obra.");
    const ok = await salvarTabela("obras", item);
    if (ok) {
      setSelectedObraId(item.id);
      form.reset();
    }
  }

  async function salvarEdicaoObra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraEditando) return;

    const form = e.currentTarget;
    const atualizacao = {
      nome: campo(form, "nome"),
      cliente: campo(form, "cliente") || null,
      endereco: campo(form, "endereco") || null,
      responsavel: campo(form, "responsavel") || null,
      data_inicio: campo(form, "data_inicio") || null,
      prazo_dias: numeroCampo(form, "prazo_dias") || null,
      status: campo(form, "status") as Obra["status"],
    };

    if (!atualizacao.nome) {
      setMensagem("Informe o nome da obra para editar.");
      return;
    }

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("obras").update(atualizacao).eq("id", obraEditando.id);
      if (error) {
        setMensagem(error.message);
        return;
      }
      await carregarRemoto();
      setObraEditando(null);
      setMensagem("Obra atualizada com sucesso.");
      return;
    }

    setData((atual) => ({
      ...atual,
      obras: atual.obras.map((obra) => obra.id === obraEditando.id ? { ...obra, ...atualizacao } : obra),
    }));
    setObraEditando(null);
    setMensagem("Obra atualizada.");
  }

  async function salvarServico(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    const form = e.currentTarget;
    const item: Servico = {
      id: uuid(),
      obra_id: obraId,
      nome: campo(form, "nome"),
      categoria: campo(form, "categoria") || null,
      unidade: campo(form, "unidade") || "un",
      qtd_prevista: numeroCampo(form, "qtd_prevista"),
      dias_previstos: numeroCampo(form, "dias_previstos") || 1,
      relacionamento_tipo: (campo(form, "relacionamento_tipo") || null) as RelacionamentoServico | null,
      servico_relacionado_id: campo(form, "servico_relacionado_id") || null,
    };
    if (!item.nome || item.qtd_prevista <= 0) return setMensagem("Informe serviço e quantidade prevista.");
    if (item.relacionamento_tipo && !item.servico_relacionado_id) return setMensagem("Selecione o serviço relacionado para criar a dependência.");

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("servicos").insert(item as any);
      if (error) {
        setMensagem(error.message);
        return;
      }

      if (item.relacionamento_tipo && item.servico_relacionado_id) {
        const { error: erroInversa } = await supabase
          .from("servicos")
          .update({
            relacionamento_tipo: relacaoInversa(item.relacionamento_tipo),
            servico_relacionado_id: item.id,
          })
          .eq("id", item.servico_relacionado_id);

        if (erroInversa) {
          setMensagem(erroInversa.message);
          return;
        }
      }

      await carregarRemoto();
      setMensagem("Serviço salvo e relação inversa atualizada automaticamente.");
      form.reset();
      return;
    }

    setMensagem("Supabase nao configurado. Confira o arquivo .env.local para salvar dados no sistema.");
  }

  async function salvarEdicaoServico(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!servicoEditando) return;
    const form = e.currentTarget;
    const atualizacao = {
      nome: campo(form, "nome"),
      categoria: campo(form, "categoria") || null,
      unidade: campo(form, "unidade") || "un",
      qtd_prevista: numeroCampo(form, "qtd_prevista"),
      dias_previstos: numeroCampo(form, "dias_previstos") || 1,
    };

    if (!atualizacao.nome || atualizacao.qtd_prevista <= 0) {
      setMensagem("Informe serviço e quantidade prevista para editar.");
      return;
    }

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("servicos").update(atualizacao).eq("id", servicoEditando.id);
      if (error) {
        setMensagem(error.message);
        return;
      }
      await carregarRemoto();
      setServicoEditando(null);
      setMensagem("Serviço atualizado com sucesso.");
      return;
    }

    setData((atual) => ({
      ...atual,
      servicos: atual.servicos.map((servico) => servico.id === servicoEditando.id ? { ...servico, ...atualizacao } : servico),
    }));
    setServicoEditando(null);
    setMensagem("Serviço atualizado.");
  }

  async function salvarRelacaoServico(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    const form = e.currentTarget;
    const servicoId = campo(form, "servico_id");
    const relacionamentoTipo = (campo(form, "relacionamento_tipo") || null) as RelacionamentoServico | null;
    const servicoRelacionadoId = campo(form, "servico_relacionado_id") || null;

    if (!servicoId) return setMensagem("Selecione o serviço principal.");
    if (relacionamentoTipo && !servicoRelacionadoId) return setMensagem("Selecione o serviço relacionado.");
    if (relacionamentoTipo && servicoId === servicoRelacionadoId) return setMensagem("O serviço não pode depender dele mesmo.");

    const servicoAtual = servicosObra.find((servico) => servico.id === servicoId);
    const antigoRelacionadoId = servicoAtual?.servico_relacionado_id || null;

    const atualizacao = {
      relacionamento_tipo: relacionamentoTipo,
      servico_relacionado_id: relacionamentoTipo ? servicoRelacionadoId : null,
    };

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("servicos").update(atualizacao).eq("id", servicoId);
      if (error) {
        setMensagem(error.message);
        return;
      }

      if (antigoRelacionadoId && antigoRelacionadoId !== servicoRelacionadoId) {
        const { error: erroLimpar } = await supabase
          .from("servicos")
          .update({ relacionamento_tipo: null, servico_relacionado_id: null })
          .eq("id", antigoRelacionadoId)
          .eq("servico_relacionado_id", servicoId);

        if (erroLimpar) {
          setMensagem(erroLimpar.message);
          return;
        }
      }

      if (relacionamentoTipo && servicoRelacionadoId) {
        const { error: erroInversa } = await supabase
          .from("servicos")
          .update({
            relacionamento_tipo: relacaoInversa(relacionamentoTipo),
            servico_relacionado_id: servicoId,
          })
          .eq("id", servicoRelacionadoId);

        if (erroInversa) {
          setMensagem(erroInversa.message);
          return;
        }
      }

      await carregarRemoto();
      setMensagem("Sequência atualizada. O serviço relacionado foi ajustado automaticamente como predecessor ou sucessor.");
      form.reset();
      return;
    }

    setData((atual) => ({
      ...atual,
      servicos: atual.servicos.map((servico) => {
        if (servico.id === servicoId) return { ...servico, ...atualizacao };
        if (antigoRelacionadoId && antigoRelacionadoId !== servicoRelacionadoId && servico.id === antigoRelacionadoId && servico.servico_relacionado_id === servicoId) {
          return { ...servico, relacionamento_tipo: null, servico_relacionado_id: null };
        }
        if (relacionamentoTipo && servicoRelacionadoId && servico.id === servicoRelacionadoId) {
          return { ...servico, relacionamento_tipo: relacaoInversa(relacionamentoTipo), servico_relacionado_id: servicoId };
        }
        return servico;
      }),
    }));
    setMensagem("Sequência atualizada. O serviço relacionado foi ajustado automaticamente como predecessor ou sucessor.");
    form.reset();
  }

  async function salvarEquipe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    const form = e.currentTarget;
    const item: MembroEquipe = {
      id: uuid(),
      obra_id: obraId,
      nome: campo(form, "nome"),
      funcao: campo(form, "funcao"),
      tipo: campo(form, "tipo") || null,
      ativo: true,
    };
    if (!item.nome || !item.funcao) return setMensagem("Informe nome e função.");
    const ok = await salvarTabela("membros_equipe", item);
    if (ok) form.reset();
  }

  async function salvarDiario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    if (!modoRemoto || !supabase) return setMensagem("Supabase nao configurado. Confira o arquivo .env.local para salvar dados no sistema.");

    const form = e.currentTarget;
    const dataDiario = campo(form, "data") || dataDiarioSelecionada || hojeISO();
    const motivo = campo(form, "motivo_sem_trabalho") || motivoSemTrabalho || "Sem trabalho no dia.";

    const equipeResumo = equipePresenteModo === "completa" ? "Equipe completa" : campo(form, "equipe_resumo") || equipeIncompletaTexto || null;
    const horasTrabalhadas = calcularHorasTrabalhadas(campo(form, "horario_inicio") || horarioInicioDiario, campo(form, "horario_termino") || horarioTerminoDiario);
    const pessoasTrabalhando = contarPessoasEquipe(equipePresenteModo, equipeResumo, equipeObra);

    const item: Diario = diarioSemTrabalho
      ? {
          id: uuid(),
          obra_id: obraId,
          data: dataDiario,
          clima: null,
          horario_inicio: null,
          horario_termino: null,
          equipe_resumo: "Sem trabalho",
          servicos_executados: "Sem trabalho",
          ocorrencias: motivo,
          visitas: null,
          observacoes: null,
          responsavel_lancamento: campo(form, "responsavel_lancamento") || null,
        }
      : {
          id: uuid(),
          obra_id: obraId,
          data: dataDiario,
          clima: campo(form, "clima") || null,
          horario_inicio: campo(form, "horario_inicio") || horarioInicioDiario || null,
          horario_termino: campo(form, "horario_termino") || horarioTerminoDiario || null,
          equipe_resumo: equipeResumo,
          servicos_executados: campo(form, "servicos_executados") || null,
          ocorrencias: campo(form, "ocorrencias") || null,
          visitas: null,
          observacoes: null,
          responsavel_lancamento: campo(form, "responsavel_lancamento") || null,
        };

    if (!diarioSemTrabalho && equipePresenteModo === "incompleta" && !item.equipe_resumo) return setMensagem("Informe quem trabalhou quando a equipe estiver incompleta.");
    if (diarioSemTrabalho && !motivo) return setMensagem("Informe o motivo do dia sem trabalho.");

    let producaoItem: Producao | null = null;

    if (!diarioSemTrabalho) {
      const servicoId = campo(form, "servico_id") || servicoDiarioId;
      const servicoSelecionado = servicosObra.find((servico) => servico.id === servicoId);
      const percentualInformado = numeroDigitado(campo(form, "percentual_execucao") || percentualExecucaoDiario);
      const quantidadeInformada = numeroDigitado(campo(form, "quantidade_execucao") || quantidadeExecucaoDiario);

      if (!servicoId || !servicoSelecionado) return setMensagem("Informe o serviço previsto para a data.");
      if (percentualInformado <= 0 && quantidadeInformada <= 0) return setMensagem("Informe a porcentagem executada ou a quantidade executada.");
      if (pessoasTrabalhando <= 0) return setMensagem("Informe a equipe presente no diário.");
      if (horasTrabalhadas <= 0) return setMensagem("Confira o horário de início e término do diário.");

      const quantidadeCalculada = quantidadeInformada > 0
        ? quantidadeInformada
        : (servicoSelecionado.qtd_prevista * percentualInformado) / 100;

      const percentualExecucao = percentualInformado > 0
        ? percentualInformado
        : servicoSelecionado.qtd_prevista > 0
          ? (quantidadeCalculada / servicoSelecionado.qtd_prevista) * 100
          : 0;

      if (percentualExecucao <= 0) return setMensagem("Informe a porcentagem executada ou a quantidade executada.");
      if (percentualExecucao > 100) return setMensagem("A porcentagem executada não pode ser maior que 100%.");

      const executadoAnterior = soma(producoesObra.filter((p) => p.servico_id === servicoId).map((p) => p.quantidade));
      const executadoTotal = executadoAnterior + quantidadeCalculada;
      const percentualTotal = servicoSelecionado.qtd_prevista > 0 ? (executadoTotal / servicoSelecionado.qtd_prevista) * 100 : 0;

      if (executadoTotal > servicoSelecionado.qtd_prevista + 0.0001) {
        return setMensagem(`Este lançamento ultrapassa o total previsto do serviço. Já executado: ${numero(executadoAnterior)} ${servicoSelecionado.unidade}. Falta executar: ${numero(Math.max(servicoSelecionado.qtd_prevista - executadoAnterior, 0))} ${servicoSelecionado.unidade}.`);
      }

      producaoItem = {
        id: uuid(),
        obra_id: obraId,
        diario_id: item.id,
        servico_id: servicoId,
        local_execucao: null,
        quantidade: quantidadeCalculada,
        pessoas: pessoasTrabalhando,
        horas: horasTrabalhadas,
        observacoes: `Percentual executado no lançamento: ${numero(percentualExecucao, 2)}% • Total acumulado após lançamento: ${numero(percentualTotal, 2)}%`,
        data: dataDiario,
      };
    }

    const { error: erroDiario } = await supabase.from("diarios").insert(item as any);
    if (erroDiario) {
      setMensagem(erroDiario.message);
      return;
    }

    if (producaoItem) {
      const { error: erroProducao } = await supabase.from("producoes").insert(producaoItem as any);
      if (erroProducao) {
        setMensagem(erroProducao.message);
        return;
      }
    }

    const inputFotos = form.elements.namedItem("fotos_diario") as HTMLInputElement | null;
    const arquivosFotos = Array.from(inputFotos?.files || []);
    const descricaoFotos = campo(form, "descricao_fotos") || null;

    if (arquivosFotos.length > 0) {
      const registrosFotos: FotoDiario[] = [];

      for (const arquivo of arquivosFotos) {
        const formData = new FormData();
        formData.append("foto", arquivo);
        formData.append("diario_id", item.id);
        formData.append("obra_id", obraId);
        if (descricaoFotos) formData.append("descricao", descricaoFotos);

        const resposta = await fetch("/api/google-drive-upload", {
          method: "POST",
          body: formData,
        });

        const json = await resposta.json().catch(() => ({}));
        if (!resposta.ok || json.error) {
          throw new Error(json.error || "Nao foi possivel enviar a foto para o Google Drive.");
        }

        registrosFotos.push({
          id: uuid(),
          diario_id: item.id,
          url: json.viewUrl || json.url || json.thumbnailUrl,
          descricao: descricaoFotos || arquivo.name,
        });
      }

      const { error: erroFotos } = await supabase.from("fotos_diario").insert(registrosFotos as any);
      if (erroFotos) {
        setMensagem(erroFotos.message);
        return;
      }
    }

    await carregarRemoto();
    form.reset();
    setDataDiarioSelecionada(hojeISO());
    setHorarioInicioDiario("07:00");
    setHorarioTerminoDiario("17:00");
    setDiarioSemTrabalho(false);
    setMotivoSemTrabalho("");
    setEquipePresenteModo("completa");
    setEquipeIncompletaTexto("");
    setPercentualExecucaoDiario("");
    setQuantidadeExecucaoDiario("");
    setMostrarNovoDiario(false);
    setMensagem(producaoItem ? "Diário de obra e produção salvos com sucesso." : "Diário sem trabalho salvo com sucesso.");
  }

  async function gerarPdfCronogramaA1() {
    if (typeof window === "undefined") return;

    const elemento = document.getElementById("grafico-cronograma-pdf-conteudo");
    if (!elemento) {
      setMensagem("Nao foi possivel encontrar o grafico completo para gerar o PDF.");
      return;
    }

    const nomeObra = (obraSelecionada?.nome || "obra")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let areaTemporaria: HTMLDivElement | null = null;

    try {
      setMensagem("Gerando PDF A1 do grafico completo...");

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      areaTemporaria = document.createElement("div");
      areaTemporaria.style.position = "fixed";
      areaTemporaria.style.left = "-100000px";
      areaTemporaria.style.top = "0";
      areaTemporaria.style.background = "#ffffff";
      areaTemporaria.style.padding = "0";
      areaTemporaria.style.margin = "0";
      areaTemporaria.style.overflow = "visible";
      areaTemporaria.style.zIndex = "-1";

      const clone = elemento.cloneNode(true) as HTMLElement;
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.width = `${elemento.scrollWidth}px`;
      clone.style.background = "#ffffff";

      areaTemporaria.appendChild(clone);
      document.body.appendChild(areaTemporaria);

      await new Promise((resolve) => window.setTimeout(resolve, 200));

      const larguraConteudo = Math.max(clone.scrollWidth, clone.offsetWidth);
      const alturaConteudo = Math.max(clone.scrollHeight, clone.offsetHeight);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: larguraConteudo,
        height: alturaConteudo,
        windowWidth: larguraConteudo,
        windowHeight: alturaConteudo,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a1",
        compress: true,
      });

      const margem = 8;
      const larguraPagina = pdf.internal.pageSize.getWidth();
      const alturaPagina = pdf.internal.pageSize.getHeight();
      const larguraUtil = larguraPagina - margem * 2;
      const alturaUtil = alturaPagina - margem * 2;

      let larguraImagem = larguraUtil;
      let alturaImagem = (canvas.height * larguraImagem) / canvas.width;

      if (alturaImagem > alturaUtil) {
        alturaImagem = alturaUtil;
        larguraImagem = (canvas.width * alturaImagem) / canvas.height;
      }

      const x = (larguraPagina - larguraImagem) / 2;
      const y = (alturaPagina - alturaImagem) / 2;

      pdf.setProperties({
        title: `Cronograma fisico - ${obraSelecionada?.nome || "Obra"}`,
        subject: "Grafico do cronograma fisico em A1",
        creator: "Sistema Controle de Obra",
      });

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, larguraImagem, alturaImagem);
      pdf.save(`cronograma-fisico-a1-${nomeObra || "obra"}.pdf`);

      setMensagem("PDF A1 do grafico completo gerado com sucesso.");
    } catch (error: any) {
      setMensagem(error?.message || "Erro ao gerar o PDF A1 do grafico.");
    } finally {
      areaTemporaria?.remove();
    }
  }

  async function salvarFotosDiario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    if (!modoRemoto || !supabase) return setMensagem("Supabase nao configurado. Confira o arquivo .env.local para salvar fotos no diario.");

    const form = e.currentTarget;
    const diarioId = campo(form, "diario_id");
    const descricao = campo(form, "descricao") || null;
    const input = form.elements.namedItem("fotos") as HTMLInputElement | null;
    const arquivos = Array.from(input?.files || []);

    if (!diarioId) return setMensagem("Selecione o diario para vincular as fotos.");
    if (arquivos.length === 0) return setMensagem("Selecione uma ou mais fotos.");

    try {
      setMensagem(`Enviando ${arquivos.length} foto(s) para o Google Drive...`);
      const registros: FotoDiario[] = [];

      for (const arquivo of arquivos) {
        const formData = new FormData();
        formData.append("foto", arquivo);
        formData.append("diario_id", diarioId);
        formData.append("obra_id", obraId);
        if (descricao) formData.append("descricao", descricao);

        const resposta = await fetch("/api/google-drive-upload", {
          method: "POST",
          body: formData,
        });

        const json = await resposta.json().catch(() => ({}));
        if (!resposta.ok || json.error) {
          throw new Error(json.error || "Nao foi possivel enviar a foto para o Google Drive.");
        }

        registros.push({
          id: uuid(),
          diario_id: diarioId,
          url: json.viewUrl || json.url || json.thumbnailUrl,
          descricao: descricao || arquivo.name,
        });
      }

      const { error } = await supabase.from("fotos_diario").insert(registros as any);
      if (error) throw error;

      await carregarRemoto();
      form.reset();
      setMensagem("Foto(s) enviada(s) para o Google Drive e vinculada(s) ao diario.");
    } catch (error: any) {
      setMensagem(error?.message || "Erro ao salvar fotos do diario.");
    }
  }

  async function salvarProducao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    const form = e.currentTarget;
    const servicoId = campo(form, "servico_id");
    const servicoSelecionado = servicosObra.find((servico) => servico.id === servicoId);
    const percentualExecucao = numeroCampo(form, "percentual_execucao");

    if (!servicoId || !servicoSelecionado) return setMensagem("Informe o serviço.");
    if (pessoasProducao <= 0) return setMensagem("O diário selecionado está como sem trabalho. Selecione um diário com equipe presente.");
    if (percentualExecucao <= 0) return setMensagem("Informe a porcentagem executada.");
    if (percentualExecucao > 100) return setMensagem("A porcentagem executada não pode ser maior que 100%.");

    const quantidadeCalculada = (servicoSelecionado.qtd_prevista * percentualExecucao) / 100;

    const item: Producao = {
      id: uuid(),
      obra_id: obraId,
      diario_id: campo(form, "diario_id") || null,
      servico_id: servicoId,
      local_execucao: null,
      quantidade: quantidadeCalculada,
      pessoas: numeroCampo(form, "pessoas"),
      horas: numeroCampo(form, "horas") || 8,
      observacoes: campo(form, "observacoes") || `Percentual executado no lançamento: ${numero(percentualExecucao, 2)}%`,
      data: campo(form, "data") || hojeISO(),
    };
    const ok = await salvarTabela("producoes", item);
    if (ok) {
      form.reset();
      setProducaoDiarioId("");
    }
  }

  async function salvarMaterial(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) return setMensagem("Cadastre ou selecione uma obra primeiro.");
    const form = e.currentTarget;
    const item: Material = {
      id: uuid(),
      obra_id: obraId,
      diario_id: campo(form, "diario_id") || null,
      data: campo(form, "data") || hojeISO(),
      material: campo(form, "material"),
      unidade: campo(form, "unidade") || "un",
      quantidade: numeroCampo(form, "quantidade"),
      fornecedor: campo(form, "fornecedor") || null,
      nota_fiscal: campo(form, "nota_fiscal") || null,
      destino: campo(form, "destino") || null,
    };
    if (!item.material || item.quantidade <= 0) return setMensagem("Informe material e quantidade.");
    const ok = await salvarTabela("materiais", item);
    if (ok) form.reset();
  }

  async function excluirObra(idObraExcluir: string, nomeObra: string) {
    const confirmar = typeof window !== "undefined"
      ? window.confirm(`Deseja excluir a obra "${nomeObra}"? Essa acao apaga tambem servicos, diarios, fotos, producoes, equipe e materiais vinculados a ela.`)
      : false;

    if (!confirmar) return;

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("obras").delete().eq("id", idObraExcluir);
      if (error) {
        setMensagem(error.message);
        return;
      }
      await carregarRemoto();
      setMensagem("Obra excluida com sucesso.");
      return;
    }

    setData((atual) => {
      const obrasRestantes = atual.obras.filter((obra) => obra.id !== idObraExcluir);
      setSelectedObraId(obrasRestantes[0]?.id || "");
      return {
        obras: obrasRestantes,
        servicos: atual.servicos.filter((item) => item.obra_id !== idObraExcluir),
        equipe: atual.equipe.filter((item) => item.obra_id !== idObraExcluir),
        diarios: atual.diarios.filter((item) => item.obra_id !== idObraExcluir),
        producoes: atual.producoes.filter((item) => item.obra_id !== idObraExcluir),
        materiais: atual.materiais.filter((item) => item.obra_id !== idObraExcluir),
        fotos: atual.fotos.filter((foto) => !atual.diarios.some((diario) => diario.obra_id === idObraExcluir && diario.id === foto.diario_id)),
      };
    });
    setMensagem("Obra excluida.");
  }

  async function excluirServico(idServicoExcluir: string, nomeServicoExcluir: string) {
    const confirmar = typeof window !== "undefined"
      ? window.confirm(`Deseja excluir o serviço "${nomeServicoExcluir}"? Essa acao apaga tambem os lancamentos de producao vinculados a esse servico.`)
      : false;

    if (!confirmar) return;

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("servicos").delete().eq("id", idServicoExcluir);
      if (error) {
        setMensagem(error.message);
        return;
      }
      await carregarRemoto();
      setMensagem("Servico excluido com sucesso.");
      return;
    }

    setData((atual) => ({
      ...atual,
      servicos: atual.servicos
        .filter((item) => item.id !== idServicoExcluir)
        .map((item) => item.servico_relacionado_id === idServicoExcluir ? { ...item, relacionamento_tipo: null, servico_relacionado_id: null } : item),
      producoes: atual.producoes.filter((item) => item.servico_id !== idServicoExcluir),
    }));
    setMensagem("Servico excluido.");
  }

  async function excluirDiario(idDiarioExcluir: string, dataDiarioExcluir: string) {
    const confirmar = typeof window !== "undefined"
      ? window.confirm(`Deseja excluir o diário de obra de ${dataBR(dataDiarioExcluir)}? As fotos vinculadas ao diário serão removidas do sistema. Os lançamentos de produção ficam salvos, mas sem vínculo com esse diário.`)
      : false;

    if (!confirmar) return;

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("diarios").delete().eq("id", idDiarioExcluir);
      if (error) {
        setMensagem(error.message);
        return;
      }
      await carregarRemoto();
      setMensagem("Diario de obra excluido com sucesso.");
      return;
    }

    setData((atual) => ({
      ...atual,
      diarios: atual.diarios.filter((item) => item.id !== idDiarioExcluir),
      fotos: atual.fotos.filter((item) => item.diario_id !== idDiarioExcluir),
      producoes: atual.producoes.map((item) => item.diario_id === idDiarioExcluir ? { ...item, diario_id: null } : item),
      materiais: atual.materiais.map((item) => item.diario_id === idDiarioExcluir ? { ...item, diario_id: null } : item),
    }));
    setMensagem("Diario de obra excluido.");
  }

  async function excluirProducao(idProducaoExcluir: string, nomeServicoExcluir: string) {
    const confirmar = typeof window !== "undefined"
      ? window.confirm(`Deseja excluir o lançamento de produtividade/produção do serviço "${nomeServicoExcluir}"? Essa ação atualiza automaticamente o avanço físico e o cronograma.`)
      : false;

    if (!confirmar) return;

    if (modoRemoto && supabase) {
      const { error } = await supabase.from("producoes").delete().eq("id", idProducaoExcluir);
      if (error) {
        setMensagem(error.message);
        return;
      }
      await carregarRemoto();
      setMensagem("Lancamento de produtividade excluido com sucesso.");
      return;
    }

    setData((atual) => ({
      ...atual,
      producoes: atual.producoes.filter((item) => item.id !== idProducaoExcluir),
    }));
    setMensagem("Lancamento de produtividade excluido.");
  }

  function nomeServico(id: string) {
    return data.servicos.find((s) => s.id === id)?.nome || "Serviço removido";
  }

  function unidadeServico(id: string) {
    return data.servicos.find((s) => s.id === id)?.unidade || "un";
  }

  function quantidadePrevistaServico(id: string) {
    return data.servicos.find((s) => s.id === id)?.qtd_prevista || 0;
  }

  function relacoesDoServico(servico: Servico) {
    const predecessores = new Set<string>();
    const sucessores = new Set<string>();
    const simultaneos = new Set<string>();

    const adicionar = (lista: Set<string>, id: string | null) => {
      if (!id || id === servico.id) return;
      const relacionado = data.servicos.find((item) => item.id === id && item.obra_id === servico.obra_id);
      if (relacionado) lista.add(relacionado.nome);
    };

    data.servicos
      .filter((item) => item.obra_id === servico.obra_id)
      .forEach((item) => {
        if (!item.relacionamento_tipo || !item.servico_relacionado_id) return;

        if (item.id === servico.id) {
          if (item.relacionamento_tipo === "predecessor") adicionar(sucessores, item.servico_relacionado_id);
          if (item.relacionamento_tipo === "sucessor") adicionar(predecessores, item.servico_relacionado_id);
          if (item.relacionamento_tipo === "mesmo_tempo") adicionar(simultaneos, item.servico_relacionado_id);
        }

        if (item.servico_relacionado_id === servico.id) {
          if (item.relacionamento_tipo === "predecessor") adicionar(predecessores, item.id);
          if (item.relacionamento_tipo === "sucessor") adicionar(sucessores, item.id);
          if (item.relacionamento_tipo === "mesmo_tempo") adicionar(simultaneos, item.id);
        }
      });

    return {
      predecessores: [...predecessores],
      sucessores: [...sucessores],
      simultaneos: [...simultaneos],
    };
  }

  function descricaoRelacaoServico(servico: Servico) {
    const relacoes = relacoesDoServico(servico);
    const partes = [
      relacoes.predecessores.length ? `Depois de: ${textoLista(relacoes.predecessores)}` : "",
      relacoes.sucessores.length ? `Antes de: ${textoLista(relacoes.sucessores)}` : "",
      relacoes.simultaneos.length ? `Junto com: ${textoLista(relacoes.simultaneos)}` : "",
    ].filter(Boolean);

    return partes.length ? partes.join(" • ") : "-";
  }

  function fotosDoDiario(diarioId: string) {
    return data.fotos.filter((foto) => foto.diario_id === diarioId);
  }

  function imagemGoogleDrive(url: string) {
    const matchPath = url.match(/\/d\/([^/]+)/);
    const matchId = url.match(/[?&]id=([^&]+)/);
    const id = matchPath?.[1] || matchId?.[1];
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url;
  }


  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Carregando sistema...</div>;
  }

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">Thebalde Camargo</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Controle de Obra V55</h1>
            <p className="mt-2 text-sm text-slate-500">Acesso aberto.</p>
          </div>

          {mensagem && (
            <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              {mensagem}
            </div>
          )}

          <Card titulo="Entrar no sistema" subtitulo="Use o e-mail e a senha cadastrados no Supabase.">
            <form onSubmit={(e) => login(e, "entrar")} className="grid gap-4">
              <Input name="email" label="E-mail" type="email" required />
              <Input name="password" label="Senha" type="password" required />
              <button className="btn-primary w-full justify-center"><HardHat size={16} /> Entrar</button>
              <button
                type="button"
                onClick={async (event) => {
                  const form = event.currentTarget.closest("form");
                  if (!form) return;
                  const fakeEvent = { preventDefault: () => undefined, currentTarget: form } as unknown as FormEvent<HTMLFormElement>;
                  await login(fakeEvent, "cadastrar");
                }}
                className="btn-secondary w-full justify-center"
              >
                Criar usuario
              </button>
            </form>
          </Card>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              O arquivo .env.local precisa estar configurado para usar o login.
            </p>
          )}
        </div>
      </main>
    );
  }

  if (active === "cronograma" && obraSelecionada) {
    const statusPrazo = avancoGeral + 5 < previstoGeral ? "Atrasado" : avancoGeral > previstoGeral + 5 ? "Adiantado" : "No prazo";

    return (
      <main className="h-screen overflow-hidden bg-slate-100 p-3">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <header className="no-print shrink-0 rounded-[28px] border border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-soft">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-black leading-tight">Cronograma Físico</h1>
                <p className="mt-1 text-xs font-semibold text-slate-200">Planejamento, previsto, executado e evolução da obra.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {data.obras.length > 0 && (
                  <select
                    className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white shadow-sm"
                    value={obraId}
                    onChange={(event) => setSelectedObraId(event.target.value)}
                  >
                    {data.obras.map((obra) => (
                      <option key={obra.id} value={obra.id} className="text-slate-900">{obra.nome}</option>
                    ))}
                  </select>
                )}

                <Link href="/dashboard" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Dashboard</Link>
                <Link href="/obras" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Obras</Link>
                <Link href="/servicos" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Serviços</Link>
                <Link href="/diario" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Diário de Obra</Link>
                <Link href="/equipe" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Equipe</Link>
                <button
                  type="button"
                  onClick={gerarPdfCronogramaA1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-slate-950 hover:bg-white"
                >
                  <FileDown size={16} /> Gerar PDF A1
                </button>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-3 pb-4">
          {mensagem && (
            <div className="no-print flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              <span>{mensagem}</span>
              <button onClick={() => setMensagem("")} className="font-bold">×</button>
            </div>
          )}

          <section className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Kpi titulo="Previsto até hoje" valor={percentual(previstoGeral)} detalhe="Pelo prazo dos serviços" />
            <Kpi titulo="Realizado" valor={percentual(avancoGeral)} detalhe="Pela produção lançada" />
            <Kpi titulo="Diferença" valor={percentual(avancoGeral - previstoGeral)} detalhe="Realizado menos previsto" />
            <Kpi titulo="Situação" valor={statusPrazo} detalhe="Comparativo físico" />
            <Kpi titulo="Dias corridos previstos" valor={String(diasTotalPrevistoObra)} detalhe="Pelo cronograma físico" />
            <Kpi titulo="Dias úteis previstos" valor={String(diasUteisPrevistosObra)} detalhe="Sem sábado e domingo" />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Gráfico do cronograma físico</h2>
                <p className="text-xs text-slate-500">A parte superior fica fixa. Use a barra acima do cabeçalho Serviço para rolar os dias do gráfico.</p>
              </div>
            </div>

            {!obraSelecionada.data_inicio && (
              <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Cadastre a data de início da obra para calcular o gráfico do cronograma.</p>
            )}

            <div className="w-full">
              <GraficoCronograma cronograma={cronogramaFisico} dataInicioObra={obraSelecionada.data_inicio} producoes={producoesObra} diarios={diariosObra} fotos={fotosObra} prazoStatus={statusPrazo === "Atrasado" ? "Fora do prazo" : statusPrazo} />
            </div>
          </section>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">Thebalde Camargo</p>
            <h1 className="text-2xl font-bold text-slate-950">Controle de Produção e Diário de Obra V55</h1>
            <p className="text-sm text-slate-500">Obras, diário, produção integrada, cronograma físico, produtividade, fotos no Google Drive e equipe.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {data.obras.length > 0 && (
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={obraId}
                onChange={(event) => setSelectedObraId(event.target.value)}
              >
                {data.obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>{obra.nome}</option>
                ))}
              </select>
            )}
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Acesso aberto
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[250px_1fr]">
        <aside className="no-print h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
          <nav className="grid gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={rotas[tab.id]}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={18} /> {tab.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section key={active} className="min-w-0">
          {mensagem && (
            <div className="no-print mb-4 flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              <span>{mensagem}</span>
              <button onClick={() => setMensagem("")} className="font-bold">×</button>
            </div>
          )}

          {!obraSelecionada && active !== "obras" && (
            <Card titulo="Comece cadastrando uma obra" subtitulo="Para usar diário, produção e relatórios, primeiro cadastre uma obra.">
              <button onClick={() => setActive("obras")} className="btn-primary"><Plus size={16} /> Cadastrar obra</button>
            </Card>
          )}

          {active === "dashboard" && obraSelecionada && (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Kpi titulo="Andamento da obra" valor={percentual(avancoGeral)} detalhe="Média física dos serviços" />
                <Kpi titulo="Dias corridos previstos" valor={String(diasTotalPrevistoObra)} detalhe="Pelo cronograma físico" />
                <Kpi titulo="Dias úteis previstos" valor={String(diasUteisPrevistosObra)} detalhe="Sem contar sábado e domingo" />
                <Kpi titulo="Situação do prazo" valor={situacaoPrazoObra} detalhe="Comparativo previsto x realizado" />
                <Kpi titulo="Dias em andamento" valor={String(diasEmAndamentoObra)} detalhe="Desde o início da obra" />
              </div>

              <Card titulo="Resumo do Diário de Obra" subtitulo="Acesse todos os diários cadastrados da obra selecionada.">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">Total de diários cadastrados: <b>{diariosObra.length}</b></p>
                    <p className="text-sm text-slate-500">Inclui dias trabalhados, dias sem trabalho, ocorrências e fotos vinculadas.</p>
                  </div>
                  <Link href="/diario" className="btn-primary">
                    <BookOpen size={16} /> Abrir diário de obra
                  </Link>
                </div>
              </Card>

              <Card titulo="Resumo dos Serviços" subtitulo="Andamento e datas previstas dos serviços da obra.">
                <ResumoServicosCronograma cronograma={cronogramaFisico} />
              </Card>
            </div>
          )}

                    {active === "resumo_diarios" && obraSelecionada && (
            <div className="grid gap-5">
              <Card titulo="Resumo do Diário de Obra" subtitulo="Todos os diários cadastrados da obra selecionada.">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
                  <button type="button" onClick={() => setActive("dashboard")} className="btn-secondary">
                    Voltar ao Dashboard
                  </button>
                  <button type="button" onClick={() => window.print()} className="btn-primary">
                    <Printer size={16} /> Imprimir / Salvar PDF
                  </button>
                </div>

                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-base font-bold text-slate-950">Resumo dos Serviços</h3>
                  <ResumoServicosCronograma cronograma={cronogramaFisico} compacto />
                </div>

                <div className="grid gap-4">
                  {diariosObra.map((diario) => {
                    const semTrabalho = /sem trabalho/i.test(String(diario.equipe_resumo || "")) || /sem trabalho/i.test(String(diario.servicos_executados || ""));
                    const producoesDoDiario = producoesObra.filter((producao) => producao.diario_id === diario.id);
                    const fotos = fotosDoDiario(diario.id);
                    const percentualObraDia = servicosObra.length
                      ? soma(producoesDoDiario.map((producao) => {
                          const qtdPrevista = quantidadePrevistaServico(producao.servico_id);
                          return qtdPrevista > 0 ? ((producao.quantidade / qtdPrevista) * 100) / servicosObra.length : 0;
                        }))
                      : 0;

                    return (
                      <article key={diario.id} className={`rounded-2xl border p-4 ${semTrabalho ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-950">Diário de {dataBR(diario.data)}</h3>
                            <p className="text-xs text-slate-500">{diario.horario_inicio || "--:--"} às {diario.horario_termino || "--:--"} • {diario.clima || (semTrabalho ? "Sem trabalho" : "Clima não informado")}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${semTrabalho ? "bg-red-100 text-red-700" : "bg-cyan-50 text-cyan-700"}`}>
                            {semTrabalho ? "Sem trabalho" : "Trabalhado"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                          <p><b>Equipe:</b> {diario.equipe_resumo || "-"}</p>
                          <p><b>Responsável:</b> {diario.responsavel_lancamento || "-"}</p>
                          <p className="md:col-span-2"><b>Serviços executados:</b> {diario.servicos_executados || "-"}</p>
                          <p className="md:col-span-2"><b>Ocorrências / motivo:</b> {diario.ocorrencias || "-"}</p>
                        </div>

                        {producoesDoDiario.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold uppercase text-slate-500">Produção vinculada</p>
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">% da obra andada no dia: {percentual(percentualObraDia)}</span>
                            </div>
                            <div className="grid gap-2">
                              {producoesDoDiario.map((producao) => {
                                const qtdPrevistaServico = quantidadePrevistaServico(producao.servico_id);
                                const percentualLancado = qtdPrevistaServico > 0 ? (producao.quantidade / qtdPrevistaServico) * 100 : 0;
                                return (
                                  <div key={producao.id} className="grid gap-2 rounded-xl bg-white p-3 text-sm md:grid-cols-4">
                                    <span><b>Serviço:</b> {nomeServico(producao.servico_id)}</span>
                                    <span><b>% lançada:</b> {percentual(percentualLancado)}</span>
                                    <span><b>Qtd.:</b> {numero(producao.quantidade)} {unidadeServico(producao.servico_id)}</span>
                                    <span><b>Equipe:</b> {producao.pessoas} pessoa(s) • {numero(producao.horas, 1)}h</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {fotos.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Fotos vinculadas</p>
                            <div className="grid gap-2">
                              {fotos.map((foto, index) => (
                                <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50">
                                  <span>{foto.descricao || `Foto ${index + 1}`}</span>
                                  <span className="inline-flex items-center gap-1">Abrir foto <ExternalLink size={14} /></span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {diariosObra.length === 0 && <Empty text="Nenhum diário de obra cadastrado." />}
                </div>
              </Card>
            </div>
          )}

          {active === "obras" && (
            <div className="grid gap-5">
              <Card titulo="Cadastrar obra" subtitulo="Cada diário, serviço, produção e material fica vinculado a uma obra.">
                <form onSubmit={salvarObra} className="grid gap-4 md:grid-cols-2">
                  <Input name="nome" label="Nome da obra" required />
                  <Input name="cliente" label="Cliente" />
                  <Input name="endereco" label="Endereço" />
                  <Input name="responsavel" label="Responsável" defaultValue="Thebalde Camargo Projetos e Construções" />
                  <Input name="data_inicio" label="Data de início" type="date" defaultValue={hojeISO()} />
                  <Input name="prazo_dias" label="Prazo previsto em dias" type="number" />
                  <Select name="status" label="Status" options={["planejada", "em_andamento", "pausada", "concluida"]} />
                  <div className="flex items-end"><button className="btn-primary"><Save size={16} /> Salvar obra</button></div>
                </form>
              </Card>

              {obraEditando && (
                <Card titulo="Editar obra" subtitulo="Ajuste nome, cliente, endereço, responsável, data de início, prazo e status da obra.">
                  <form onSubmit={salvarEdicaoObra} className="grid gap-4 md:grid-cols-2">
                    <Input name="nome" label="Nome da obra" defaultValue={obraEditando.nome} required />
                    <Input name="cliente" label="Cliente" defaultValue={obraEditando.cliente || ""} />
                    <Input name="endereco" label="Endereço" defaultValue={obraEditando.endereco || ""} />
                    <Input name="responsavel" label="Responsável" defaultValue={obraEditando.responsavel || ""} />
                    <Input name="data_inicio" label="Data de início" type="date" defaultValue={obraEditando.data_inicio || hojeISO()} />
                    <Input name="prazo_dias" label="Prazo previsto em dias" type="number" defaultValue={obraEditando.prazo_dias ? String(obraEditando.prazo_dias) : ""} />
                    <Select name="status" label="Status" defaultValue={obraEditando.status} options={["planejada", "em_andamento", "pausada", "concluida"]} />
                    <div className="flex items-end gap-2">
                      <button className="btn-primary"><Save size={16} /> Salvar edição</button>
                      <button type="button" onClick={() => setObraEditando(null)} className="btn-secondary">Cancelar</button>
                    </div>
                  </form>
                </Card>
              )}

              <Card titulo="Obras cadastradas" subtitulo="Clique em uma obra para trabalhar nela.">
                <div className="grid gap-3">
                  {data.obras.map((obra) => (
                    <article key={obra.id} className={`flex flex-col gap-3 rounded-2xl border p-4 transition md:flex-row md:items-center md:justify-between ${obra.id === obraId ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}>
                      <button onClick={() => setSelectedObraId(obra.id)} className="flex-1 text-left">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>{obra.nome}</strong>
                          <span className="text-xs uppercase tracking-wide opacity-70">{obra.status.replace("_", " ")}</span>
                        </div>
                        <p className="mt-1 text-sm opacity-75">{obra.cliente || "Cliente nao informado"} • {obra.endereco || "Endereco nao informado"}</p>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setObraEditando(obra)}
                          title="Editar obra"
                          aria-label={`Editar obra ${obra.nome}`}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold transition ${obra.id === obraId ? "border-white/20 bg-white/10 text-white hover:bg-white/20" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirObra(obra.id, obra.nome)}
                          title="Excluir obra"
                          aria-label={`Excluir obra ${obra.nome}`}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold transition ${obra.id === obraId ? "border-white/20 bg-white/10 text-white hover:bg-white/20" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {active === "servicos" && obraSelecionada && (
            <div className="grid gap-5">
              <Card titulo="Cadastro de serviços da obra" subtitulo="Informe unidade, quantitativo total, dias previstos e a sequência do serviço no cronograma.">
                <form onSubmit={salvarServico} className="grid gap-5">
                  <div className="grid gap-4 lg:grid-cols-[2fr_1.4fr_0.8fr]">
                    <Input name="nome" label="Serviço" placeholder="Ex.: Alvenaria, Reboco, Pintura" required />
                    <Input name="categoria" label="Categoria/etapa" placeholder="Ex.: Estrutura, Acabamento" />
                    <Input name="unidade" label="Unidade" defaultValue="m²" />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <Input name="qtd_prevista" label="Quantidade prevista" type="number" step="0.01" required />
                    <Input name="dias_previstos" label="Dias previstos" type="number" defaultValue="1" required />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                    <SelectRelacao name="relacionamento_tipo" label="Relação no cronograma" />
                    <SelectId name="servico_relacionado_id" label="Serviço relacionado" items={servicosObra.map((s) => ({ id: s.id, nome: s.nome }))} optionalLabel="Sem relação" />
                    <button className="btn-primary min-h-[42px] w-full lg:w-auto lg:px-8"><Plus size={16} /> Adicionar</button>
                  </div>

                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Exemplo: Alvenaria pode ser sucessora do Radier. Laje pode ser sucessora da Alvenaria. Tratamento de emendas pode ser ao mesmo tempo que Elétrica.
                  </p>
                </form>
              </Card>

              <Card titulo="Configurar sequência entre serviços" subtitulo="Ao salvar uma relação, o outro serviço é atualizado automaticamente com a relação inversa.">
                <form onSubmit={salvarRelacaoServico} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                  <SelectId name="servico_id" label="Serviço principal" items={servicosObra.map((s) => ({ id: s.id, nome: s.nome }))} optionalLabel="Selecione" />
                  <SelectRelacao name="relacionamento_tipo" label="Relação" />
                  <SelectId name="servico_relacionado_id" label="Serviço relacionado" items={servicosObra.map((s) => ({ id: s.id, nome: s.nome }))} optionalLabel="Sem relação" />
                  <button className="btn-primary min-h-[42px] w-full lg:w-auto lg:px-8"><Save size={16} /> Salvar sequência</button>
                </form>
              </Card>

              {servicoEditando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                  <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Editar serviço</h2>
                        <p className="text-sm text-slate-500">Ajuste os dados e clique em OK para salvar e fechar.</p>
                      </div>
                      <button type="button" onClick={() => setServicoEditando(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">×</button>
                    </div>
                    <form onSubmit={salvarEdicaoServico} className="grid gap-4 md:grid-cols-2">
                      <Input name="nome" label="Serviço" defaultValue={servicoEditando.nome} required />
                      <Input name="categoria" label="Categoria/etapa" defaultValue={servicoEditando.categoria || ""} />
                      <Input name="unidade" label="Unidade" defaultValue={servicoEditando.unidade || "un"} />
                      <Input name="qtd_prevista" label="Quantidade prevista" type="number" step="0.01" defaultValue={String(servicoEditando.qtd_prevista)} required />
                      <Input name="dias_previstos" label="Dias previstos" type="number" defaultValue={String(servicoEditando.dias_previstos || 1)} required />
                      <div className="flex items-end justify-end gap-2 md:col-span-2">
                        <button type="button" onClick={() => setServicoEditando(null)} className="btn-secondary">Cancelar</button>
                        <button className="btn-primary"><Save size={16} /> OK</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <Card titulo="Serviços e avanço físico" subtitulo="O executado é somado automaticamente pelos lançamentos de produção.">
                <TabelaAvanco avancos={avancos} onEditarServico={setServicoEditando} onExcluirServico={excluirServico} relacoesDoServico={relacoesDoServico} />
              </Card>
            </div>
          )}

          {active === "diarios" && obraSelecionada && (
            <div className="grid gap-5">
              <div className="no-print flex flex-wrap gap-3">
                <button type="button" onClick={() => setMostrarNovoDiario(true)} className="btn-primary">
                  <Plus size={16} /> Novo diário de obra
                </button>
                <button type="button" onClick={() => setMostrarDiariosLancados(true)} className="btn-secondary">
                  <BookOpen size={16} /> Diários lançados
                </button>
                <button type="button" onClick={() => setMostrarProdutividade(true)} className="btn-secondary">
                  <BarChart3 size={16} /> Produtividade da equipe
                </button>
                <button type="button" onClick={() => setMostrarServicosConcluidos(true)} className="btn-secondary">
                  <CheckCircle2 size={16} /> Serviços concluídos ({servicosConcluidosDiario.length})
                </button>
              </div>

              <Card titulo="Andamento dos serviços">
                <TabelaAvanco avancos={servicosEmAndamentoDiario} />
              </Card>



              {mostrarNovoDiario && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                  <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Novo diário de obra</h2>
                        <p className="text-sm text-slate-500">Preencha o diário, produção do dia e fotos opcionais. Clique em OK para confirmar.</p>
                      </div>
                      <button type="button" onClick={() => setMostrarNovoDiario(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">×</button>
                    </div>
                    <div className="p-5">
              <Card titulo="Novo diário de obra">
                <form onSubmit={salvarDiario} className="grid gap-4 md:grid-cols-2">
                  <Input
                    name="data"
                    label="Data"
                    type="date"
                    value={dataDiarioSelecionada}
                    onChange={(valor) => {
                      setDataDiarioSelecionada(valor || hojeISO());
                      setMotivoSemTrabalho("");
                      setDiarioSemTrabalho(ehFimDeSemana(dataMeioDia(valor || hojeISO())));
                    }}
                  />

                  <div className="grid gap-2 text-sm font-semibold text-slate-700">
                    Situação do dia
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDiarioSemTrabalho(true)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition ${diarioSemTrabalho ? "bg-red-600 text-white" : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}
                      >
                        {rotuloDiaSemTrabalho}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiarioSemTrabalho(false)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition ${diarioTrabalhado ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                      >
                        {diarioFimDeSemana ? `${nomeDiaSemana(dataDiarioObj)} trabalhado` : "Dia trabalhado"}
                      </button>
                    </div>
                  </div>

                  {diarioSemTrabalho ? (
                    <div key="diario-sem-trabalho" className="contents">
                      <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        Este diário será salvo como <b>Sem trabalho</b>. Os campos de clima, equipe, serviços e ocorrências ficam ocultos para este dia.
                      </div>
                      <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
                        Motivo do dia sem trabalho
                        <textarea
                          name="motivo_sem_trabalho"
                          rows={3}
                          value={motivoSemTrabalho}
                          onChange={(event) => setMotivoSemTrabalho(event.target.value)}
                          placeholder="Ex.: Sábado sem trabalho, domingo sem trabalho, chuva forte, feriado, falta de material..."
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        />
                      </label>
                      <Input name="responsavel_lancamento" label="Responsável pelo lançamento" />
                      <div className="flex items-end"><button className="btn-primary"><Save size={16} /> OK</button></div>
                    </div>
                  ) : (
                    <div key="diario-trabalhado" className="contents">
                      <Select name="clima" label="Clima" options={["Ensolarado", "Nublado", "Chuva Fina", "Chuva Forte"]} />
                      <div />
                      <Input name="horario_inicio" label="Horário início" type="time" value={horarioInicioDiario} onChange={setHorarioInicioDiario} />
                      <Input name="horario_termino" label="Horário término" type="time" value={horarioTerminoDiario} onChange={setHorarioTerminoDiario} />

                      <div className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                        Equipe presente
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEquipePresenteModo("completa")}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${equipePresenteModo === "completa" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                          >
                            Equipe completa
                          </button>
                          <button
                            type="button"
                            onClick={() => setEquipePresenteModo("incompleta")}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${equipePresenteModo === "incompleta" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                          >
                            Equipe incompleta
                          </button>
                        </div>
                        {equipePresenteModo === "incompleta" && (
                          <textarea
                            name="equipe_resumo"
                            rows={3}
                            value={equipeIncompletaTexto}
                            onChange={(event) => setEquipeIncompletaTexto(event.target.value)}
                            placeholder="Digite quem trabalhou. Ex.: João - pedreiro; Carlos - servente"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        )}
                        {equipePresenteModo === "completa" && (
                          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-normal text-slate-500">Será salvo como: Equipe completa.</p>
                        )}
                      </div>

                      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 md:grid-cols-2 xl:grid-cols-3">
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Serviço previsto para a data
                          <select
                            name="servico_id"
                            value={servicoDiarioId}
                            onChange={(event) => setServicoDiarioId(event.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          >
                            {servicosObra.map((s) => <option key={s.id} value={s.id}>{s.nome} ({s.unidade})</option>)}
                          </select>
                          <span className="text-xs font-semibold text-cyan-700">
                            Andamento atual: {percentual(avancoServicoDiario)}{unidadeServicoDiario ? ` • Executado atual: ${numero(executadoAtualServicoDiario)} ${unidadeServicoDiario} • Falta executar: ${numero(faltaAtualServicoDiario)} ${unidadeServicoDiario}` : ""}
                          </span>
                          {quantidadeLancamentoDiarioPreview > 0 && unidadeServicoDiario && (
                            <span className="text-xs font-medium text-slate-500">
                              Com este lançamento: total executado {numero(executadoTotalAposLancamentoDiario)} {unidadeServicoDiario} • falta {numero(faltaAposLancamentoDiario)} {unidadeServicoDiario} • andamento total {percentual(avancoAposLancamentoDiario)}
                            </span>
                          )}
                        </label>

                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Porcentagem executada (%)
                          <input
                            name="percentual_execucao"
                            type="number"
                            step="0.0001"
                            min="0"
                            value={percentualExecucaoDiario}
                            onChange={(event) => atualizarPercentualExecucaoDiario(event.target.value)}
                            placeholder="Ex.: 25"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>

                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Quantidade executada {unidadeServicoDiario ? `(${unidadeServicoDiario})` : ""}
                          <input
                            name="quantidade_execucao"
                            type="number"
                            step="0.0001"
                            min="0"
                            value={quantidadeExecucaoDiario}
                            onChange={(event) => atualizarQuantidadeExecucaoDiario(event.target.value)}
                            placeholder={unidadeServicoDiario ? `Ex.: 10 ${unidadeServicoDiario}` : "Ex.: 10"}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>

                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Horas trabalhadas
                          <input
                            name="horas_auto"
                            value={numero(horasDiarioAutomatico, 1)}
                            readOnly
                            className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-medium shadow-sm"
                          />
                        </label>

                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Nº de pessoas
                          <input
                            name="pessoas_auto"
                            value={pessoasDiarioAutomatico}
                            readOnly
                            className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-medium shadow-sm"
                          />
                        </label>
                      </div>

                      <Textarea name="servicos_executados" label="Serviços executados" placeholder="Descreva o que foi executado no dia" />
                      <Textarea name="ocorrencias" label="Ocorrências" placeholder="Atrasos, problemas, acidentes, interferências..." />

                      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 md:grid-cols-2">
                        <Input name="descricao_fotos" label="Descrição das fotos" placeholder="Ex.: Alvenaria, fundação, concretagem..." />
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Fotos do diário (opcional)
                          <input name="fotos_diario" type="file" accept="image/*" multiple className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                          <span className="text-xs font-normal text-slate-500">Pode selecionar várias fotos. Não é obrigatório.</span>
                        </label>
                      </div>

                      <Input name="responsavel_lancamento" label="Responsável pelo lançamento" />
                      <div className="flex items-end"><button className="btn-primary"><Save size={16} /> OK</button></div>
                    </div>
                  )}
                </form>
              </Card>


                    </div>
                  </div>
                </div>
              )}

              {mostrarServicosConcluidos && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                  <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Serviços concluídos</h2>
                        <p className="text-sm text-slate-500">Serviços com 100% de avanço ficam ocultos da página principal e aparecem aqui.</p>
                      </div>
                      <button type="button" onClick={() => setMostrarServicosConcluidos(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">×</button>
                    </div>
                    <div className="p-5">
                      <Card titulo="Serviços concluídos">
                        <TabelaAvanco avancos={servicosConcluidosDiario} />
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {mostrarProdutividade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                  <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Produtividade da equipe</h2>
                        <p className="text-sm text-slate-500">Alimentada pelos lançamentos feitos no Diário de Obra.</p>
                      </div>
                      <button type="button" onClick={() => setMostrarProdutividade(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">×</button>
                    </div>
                    <div className="p-5">
              <Card titulo="Produtividade da equipe">
                <div className="overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Data</th><th className="p-3">Serviço</th><th className="p-3 text-right">% lançada</th><th className="p-3 text-right">Qtd. calculada</th><th className="p-3 text-right">Andamento</th><th className="p-3 text-right">Pessoas</th><th className="p-3 text-right">Horas</th><th className="p-3 text-right">HH</th><th className="p-3 text-right">Produtividade</th><th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {producoesObra.map((producao) => {
                        const hh = producao.pessoas * producao.horas;
                        const prod = hh > 0 ? producao.quantidade / hh : 0;
                        const qtdPrevistaServico = quantidadePrevistaServico(producao.servico_id);
                        const percentualLancado = qtdPrevistaServico > 0 ? (producao.quantidade / qtdPrevistaServico) * 100 : 0;
                        const andamento = avancos.find((item) => item.servico.id === producao.servico_id)?.avanco || 0;
                        return (
                          <tr key={producao.id} className="border-b border-slate-100">
                            <td className="p-3">{dataBR(producao.data)}</td>
                            <td className="p-3 font-semibold">{nomeServico(producao.servico_id)}</td>
                            <td className="p-3 text-right font-bold">{percentual(percentualLancado)}</td>
                            <td className="p-3 text-right">{numero(producao.quantidade)} {unidadeServico(producao.servico_id)}</td>
                            <td className="p-3 text-right font-bold">{percentual(andamento)}</td>
                            <td className="p-3 text-right">{producao.pessoas}</td>
                            <td className="p-3 text-right">{numero(producao.horas, 1)}</td>
                            <td className="p-3 text-right">{numero(hh, 1)}</td>
                            <td className="p-3 text-right font-semibold">{numero(prod, 2)} {unidadeServico(producao.servico_id)}/hh</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                title="Excluir lançamento de produtividade"
                                onClick={() => excluirProducao(producao.id, nomeServico(producao.servico_id))}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {producoesObra.length === 0 && <Empty text="Nenhuma produção lançada ainda." />}
                </div>
              </Card>


                    </div>
                  </div>
                </div>
              )}

              {mostrarDiariosLancados && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                  <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Diários lançados</h2>
                        <p className="text-sm text-slate-500">Todos os diários de obra cadastrados.</p>
                      </div>
                      <button type="button" onClick={() => setMostrarDiariosLancados(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">×</button>
                    </div>
                    <div className="p-5">
              <Card titulo="Diários lançados" subtitulo="Histórico da obra selecionada com fotos vinculadas.">
                <div className="grid gap-3">
                  {diariosObra.map((diario) => {
                    const producoesDoDiario = producoesObra.filter((producao) => producao.diario_id === diario.id);
                    const fotos = fotosDoDiario(diario.id);
                    const percentualObraDia = servicosObra.length
                      ? soma(producoesDoDiario.map((producao) => {
                          const qtdPrevista = quantidadePrevistaServico(producao.servico_id);
                          return qtdPrevista > 0 ? ((producao.quantidade / qtdPrevista) * 100) / servicosObra.length : 0;
                        }))
                      : 0;

                    return (
                    <article key={diario.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <strong>Diário de {dataBR(diario.data)}</strong>
                          <p className="text-xs text-slate-500">{diario.horario_inicio || "--:--"} às {diario.horario_termino || "--:--"} • {diario.clima || "Clima não informado"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="text-slate-400" size={22} />
                          <button
                            type="button"
                            title="Excluir diário de obra"
                            onClick={() => excluirDiario(diario.id, diario.data)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                        <p><b>Equipe:</b> {diario.equipe_resumo || "-"}</p>
                        <p><b>Serviços:</b> {diario.servicos_executados || "-"}</p>
                        <p><b>Ocorrências:</b> {diario.ocorrencias || "-"}</p>
                      </div>

                      {producoesDoDiario.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase text-slate-500">Produtividade do dia</p>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">% da obra andada no dia: {percentual(percentualObraDia)}</span>
                          </div>

                          <div className="grid gap-2">
                            {producoesDoDiario.map((producao) => {
                              const qtdPrevistaServico = quantidadePrevistaServico(producao.servico_id);
                              const percentualLancado = qtdPrevistaServico > 0 ? (producao.quantidade / qtdPrevistaServico) * 100 : 0;
                              const hh = producao.pessoas * producao.horas;
                              const produtividade = hh > 0 ? producao.quantidade / hh : 0;
                              return (
                                <div key={producao.id} className="grid gap-2 rounded-xl bg-white p-3 text-sm md:grid-cols-5">
                                  <span><b>Serviço:</b> {nomeServico(producao.servico_id)}</span>
                                  <span><b>% do serviço:</b> {percentual(percentualLancado)}</span>
                                  <span><b>Qtd. feita:</b> {numero(producao.quantidade)} {unidadeServico(producao.servico_id)}</span>
                                  <span><b>Equipe:</b> {producao.pessoas} pessoa(s) • {numero(producao.horas, 1)}h</span>
                                  <span><b>Produtividade:</b> {numero(produtividade, 2)} {unidadeServico(producao.servico_id)}/hh</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {fotos.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-bold uppercase text-slate-500">Fotos vinculadas</p>
                          <div className="grid gap-2">
                            {fotos.map((foto, index) => (
                              <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50">
                                <span>{foto.descricao || `Foto ${index + 1}`}</span>
                                <span className="inline-flex items-center gap-1">Abrir foto <ExternalLink size={14} /></span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                    );
                  })}

                  {diariosObra.length === 0 && <Empty text="Nenhum diário lançado ainda." />}
                </div>
              </Card>

                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === "cronograma" && obraSelecionada && (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Kpi titulo="Previsto até hoje" valor={percentual(previstoGeral)} detalhe="Pelo prazo dos serviços" />
                <Kpi titulo="Realizado" valor={percentual(avancoGeral)} detalhe="Pela produção lançada" />
                <Kpi titulo="Diferença" valor={percentual(avancoGeral - previstoGeral)} detalhe="Realizado menos previsto" />
                <Kpi titulo="Situação" valor={avancoGeral + 5 < previstoGeral ? "Atrasado" : avancoGeral > previstoGeral + 5 ? "Adiantado" : "No prazo"} detalhe="Comparativo físico" />
              </div>

              <Card titulo="Gráfico do cronograma físico" subtitulo="Em dias, iniciando na data inicial da obra, com prazo previsto e andamento atual de cada serviço.">
                {!obraSelecionada.data_inicio && (
                  <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Cadastre a data de início da obra para calcular o gráfico do cronograma.</p>
                )}
                <div className="no-print mb-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={gerarPdfCronogramaA1}
                    className="btn-primary"
                  >
                    <FileDown size={16} /> Gerar PDF A1
                  </button>
                </div>
                <GraficoCronograma cronograma={cronogramaFisico} dataInicioObra={obraSelecionada.data_inicio} producoes={producoesObra} diarios={diariosObra} fotos={fotosObra} prazoStatus={avancoGeral + 5 < previstoGeral ? "Fora do prazo" : avancoGeral > previstoGeral + 5 ? "Adiantado" : "No prazo"} />
              </Card>

              <Card titulo="Resumo do cronograma físico" subtitulo="Tabela de apoio com sequência, datas previstas e comparação entre previsto e realizado.">
                {!obraSelecionada.data_inicio && (
                  <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Cadastre a data de início da obra para calcular o cronograma físico.</p>
                )}
                <div className="overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Serviço</th>
                        <th className="p-3">Sequência</th>
                        <th className="p-3 text-right">Dias previstos</th>
                        <th className="p-3">Início previsto</th>
                        <th className="p-3">Fim previsto</th>
                        <th className="p-3 text-right">Previsto hoje</th>
                        <th className="p-3 text-right">Realizado</th>
                        <th className="p-3 text-right">Diferença</th>
                        <th className="p-3">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronogramaFisico.map((item) => (
                        <tr key={item.servico.id} className="border-b border-slate-100">
                          <td className="p-3 font-semibold">{item.servico.nome}</td>
                          <td className="p-3 text-xs font-semibold text-slate-500">{item.relacao}</td>
                          <td className="p-3 text-right">{item.diasPrevistos}</td>
                          <td className="p-3">{dataBR(item.inicioPrevisto)}</td>
                          <td className="p-3">{dataBR(item.fimPrevisto)}</td>
                          <td className="p-3 text-right">{percentual(item.avancoPrevisto)}</td>
                          <td className="p-3 text-right font-bold">{percentual(item.avancoReal)}</td>
                          <td className="p-3 text-right">{percentual(item.diferenca)}</td>
                          <td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{item.situacao}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cronogramaFisico.length === 0 && <Empty text="Cadastre serviços com dias previstos e defina a data de início da obra." />}
                </div>
              </Card>
            </div>
          )}

          {active === "equipe" && obraSelecionada && (
            <div className="grid gap-5">
              <Card titulo="Cadastrar equipe" subtitulo="Cadastre funcionários, diaristas e terceirizados da obra.">
                <form onSubmit={salvarEquipe} className="grid gap-4 md:grid-cols-4">
                  <Input name="nome" label="Nome" required />
                  <Input name="funcao" label="Função" placeholder="Pedreiro, servente..." required />
                  <Input name="tipo" label="Tipo" placeholder="Funcionário, diarista, terceirizado" />
                  <div className="flex items-end"><button className="btn-primary"><Plus size={16} /> Adicionar</button></div>
                </form>
              </Card>
              <Card titulo="Equipe cadastrada" subtitulo="Relação de mão de obra vinculada à obra.">
                <div className="grid gap-3 md:grid-cols-2">
                  {equipeObra.map((membro) => (
                    <article key={membro.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><UserRound size={18} /></div>
                      <div>
                        <strong>{membro.nome}</strong>
                        <p className="text-sm text-slate-500">{membro.funcao} • {membro.tipo || "Tipo não informado"}</p>
                      </div>
                    </article>
                  ))}
                  {equipeObra.length === 0 && <Empty text="Nenhum membro cadastrado." />}
                </div>
              </Card>
            </div>
          )}

          {active === "materiais" && obraSelecionada && (
            <div className="grid gap-5">
              <Card titulo="Entrada de materiais" subtitulo="Registre material recebido, quantidade, fornecedor, nota fiscal e destino.">
                <form onSubmit={salvarMaterial} className="grid gap-4 md:grid-cols-4">
                  <Input name="data" label="Data" type="date" defaultValue={hojeISO()} />
                  <Input name="material" label="Material" required />
                  <Input name="quantidade" label="Quantidade" type="number" step="0.01" required />
                  <Input name="unidade" label="Unidade" defaultValue="un" />
                  <Input name="fornecedor" label="Fornecedor" />
                  <Input name="nota_fiscal" label="Nota fiscal" />
                  <Input name="destino" label="Local de uso/destino" />
                  <SelectId name="diario_id" label="Vincular ao diário" items={diariosObra.map((d) => ({ id: d.id, nome: dataBR(d.data) }))} optionalLabel="Sem vínculo" />
                  <div className="md:col-span-4"><button className="btn-primary"><Save size={16} /> Salvar material</button></div>
                </form>
              </Card>
              <Card titulo="Materiais registrados" subtitulo="Entradas de materiais da obra selecionada.">
                <div className="overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                      <tr><th className="p-3">Data</th><th className="p-3">Material</th><th className="p-3 text-right">Qtd.</th><th className="p-3">Fornecedor</th><th className="p-3">NF</th><th className="p-3">Destino</th></tr>
                    </thead>
                    <tbody>
                      {materiaisObra.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100">
                          <td className="p-3">{dataBR(m.data)}</td>
                          <td className="p-3 font-semibold">{m.material}</td>
                          <td className="p-3 text-right">{numero(m.quantidade)} {m.unidade}</td>
                          <td className="p-3">{m.fornecedor || "-"}</td>
                          <td className="p-3">{m.nota_fiscal || "-"}</td>
                          <td className="p-3">{m.destino || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {materiaisObra.length === 0 && <Empty text="Nenhum material registrado." />}
                </div>
              </Card>
            </div>
          )}

          {active === "relatorios" && obraSelecionada && (
            <div className="grid gap-5">
              <Card titulo="Gerar relatório" subtitulo="Filtre o período e clique em imprimir. Na tela de impressão, escolha salvar como PDF.">
                <div className="no-print grid gap-4 md:grid-cols-4">
                  <Input name="inicio" label="Data inicial" type="date" value={periodoInicio} onChange={(v) => setPeriodoInicio(v)} />
                  <Input name="fim" label="Data final" type="date" value={periodoFim} onChange={(v) => setPeriodoFim(v)} />
                  <button onClick={() => window.print()} className="btn-primary mt-6"><Printer size={16} /> Imprimir / Salvar PDF</button>
                  <button onClick={() => { setPeriodoInicio(""); setPeriodoFim(""); }} className="btn-secondary mt-6"><RefreshCw size={16} /> Limpar filtro</button>
                </div>
              </Card>

              <div className="print-area rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <div className="border-b border-slate-200 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Relatório de obra</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">{obraSelecionada.nome}</h2>
                  <p className="text-sm text-slate-600">Cliente: {obraSelecionada.cliente || "-"} • Responsável: {obraSelecionada.responsavel || "-"}</p>
                  <p className="text-sm text-slate-600">Período: {periodoInicio ? dataBR(periodoInicio) : "início"} a {periodoFim ? dataBR(periodoFim) : "hoje"}</p>
                </div>

                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  <Kpi titulo="Avanço geral" valor={percentual(avancoGeral)} detalhe="Média dos serviços" />
                  <Kpi titulo="Produções no período" valor={String(producoesPeriodo.length)} detalhe="Lançamentos filtrados" />
                  <Kpi titulo="Produtividade média" valor={`${numero(produtividadeMedia, 2)} un/hh`} detalhe="Toda a obra" />
                </section>

                <section className="mt-6">
                  <h3 className="mb-3 text-lg font-bold">Avanço físico</h3>
                  <TabelaAvanco avancos={avancos} />
                </section>

                <section className="mt-6">
                  <h3 className="mb-3 text-lg font-bold">Produção do período</h3>
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                        <tr><th className="p-3">Data</th><th className="p-3">Serviço</th><th className="p-3 text-right">Quantidade</th><th className="p-3 text-right">Produtividade</th></tr>
                      </thead>
                      <tbody>
                        {producoesPeriodo.map((p) => {
                          const hh = p.pessoas * p.horas;
                          return (
                            <tr key={p.id} className="border-b border-slate-100">
                              <td className="p-3">{dataBR(p.data)}</td>
                              <td className="p-3">{nomeServico(p.servico_id)}</td>
                              <td className="p-3 text-right">{numero(p.quantidade)} {unidadeServico(p.servico_id)}</td>
                              <td className="p-3 text-right">{hh > 0 ? `${numero(p.quantidade / hh, 2)} ${unidadeServico(p.servico_id)}/hh` : "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {producoesPeriodo.length === 0 && <Empty text="Nenhuma produção no período selecionado." />}
                  </div>
                </section>

                <section className="mt-6">
                  <h3 className="mb-3 text-lg font-bold">Últimos diários</h3>
                  <div className="grid gap-3">
                    {diariosObra.slice(0, 5).map((d) => (
                      <div key={d.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                        <strong>{dataBR(d.data)} — {d.clima || "Clima não informado"}</strong>
                        <p className="mt-1"><b>Equipe:</b> {d.equipe_resumo || "-"}</p>
                        <p><b>Serviços:</b> {d.servicos_executados || "-"}</p>
                        <p><b>Ocorrências:</b> {d.ocorrencias || "-"}</p>
                        {fotosDoDiario(d.id).length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {fotosDoDiario(d.id).slice(0, 6).map((foto) => (
                              <img key={foto.id} src={imagemGoogleDrive(foto.url)} alt={foto.descricao || "Foto do diario"} className="h-28 w-full rounded-xl object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}


        </section>
      </div>
    </main>
  );
}

function Card({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{text}</div>;
}

function Input({ label, name, type = "text", step, required, defaultValue, placeholder, value, onChange }: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const inputControlProps = value !== undefined
    ? {
        value: value ?? "",
        onChange: (event: { target: HTMLInputElement }) => onChange?.(event.target.value),
      }
    : {
        defaultValue,
      };

  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input
        key={name}
        name={name}
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        {...inputControlProps}
      />
    </label>
  );
}

function Textarea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <textarea name={name} rows={4} placeholder={placeholder} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
    </label>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
        {options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}

function SelectRelacao({ label, name }: { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
        <option value="">Sem relação</option>
        <option value="predecessor">Predecessor de</option>
        <option value="sucessor">Sucessor de</option>
        <option value="mesmo_tempo">Ao mesmo tempo que</option>
      </select>
    </label>
  );
}

function SelectId({ label, name, items, optionalLabel }: { label: string; name: string; items: { id: string; nome: string }[]; optionalLabel?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
        {optionalLabel && <option value="">{optionalLabel}</option>}
        {items.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
      </select>
    </label>
  );
}

function GraficoCronograma({
  cronograma,
  dataInicioObra,
  producoes,
  diarios,
  fotos,
  prazoStatus,
}: {
  cronograma: {
    servico: Servico;
    diasPrevistos: number;
    diasExecutados: number;
    inicioOffset: number;
    fimOffset: number;
    inicioPrevisto: string;
    fimPrevisto: string;
    relacao: string;
    avancoPrevisto: number;
    avancoReal: number;
    diferenca: number;
    situacao: string;
  }[];
  dataInicioObra: string | null;
  producoes: Producao[];
  diarios: Diario[];
  fotos: FotoDiario[];
  prazoStatus: string;
}) {
  const barraTopoRef = useRef<HTMLDivElement | null>(null);
  const graficoDiasRef = useRef<HTMLDivElement | null>(null);
  const [diarioCronogramaSelecionado, setDiarioCronogramaSelecionado] = useState<{ data: string; servicoId: string; servicoNome: string } | null>(null);

  if (!cronograma.length || !dataInicioObra) {
    return <Empty text="Cadastre a data de início da obra e os serviços para gerar o gráfico." />;
  }

  const inicio = dataMeioDia(dataInicioObra);
  const totalDias = Math.max(...cronograma.map((item) => item.fimOffset + 1), 1);
  const dias = Array.from({ length: totalDias }, (_, index) => ({
    indice: index,
    numero: index + 1,
    data: adicionarDias(inicio, index),
  }));

  const diariosSemTrabalho = new Map(
    diarios
      .filter((diario) => /sem trabalho/i.test(String(diario.equipe_resumo || "")) || /sem trabalho/i.test(String(diario.servicos_executados || "")))
      .map((diario) => [diario.data, diario.ocorrencias || "Sem trabalho"])
  );

  const fimPrevistoData = adicionarDias(inicio, totalDias - 1);
  const diasTotaisPrevistos = totalDias;
  const diasUteisPrevistos = dias.filter((dia) => !ehFimDeSemana(dia.data)).length;
  const diasTrabalhados = new Set(
    diarios
      .filter((diario) => !(/sem trabalho/i.test(String(diario.equipe_resumo || "")) || /sem trabalho/i.test(String(diario.servicos_executados || ""))))
      .map((diario) => diario.data)
  ).size;
  const andamentoAtual = cronograma.length ? soma(cronograma.map((item) => Math.min(item.avancoReal, 100))) / cronograma.length : 0;

  const larguraDias = dias.length * 38;

  function sincronizarTopo(scrollLeft: number) {
    if (graficoDiasRef.current && graficoDiasRef.current.scrollLeft !== scrollLeft) {
      graficoDiasRef.current.scrollLeft = scrollLeft;
    }
  }

  function sincronizarDias(scrollLeft: number) {
    if (barraTopoRef.current && barraTopoRef.current.scrollLeft !== scrollLeft) {
      barraTopoRef.current.scrollLeft = scrollLeft;
    }
  }

  return (
    <div id="grafico-cronograma-pdf-conteudo" className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-white px-3 py-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">Cronograma físico da obra</div>
            <div className="text-xs text-slate-500">Resumo de prazo para impressão em PDF A1</div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <div><span className="font-semibold">Início:</span> {dataBR(dataInicioObra)}</div>
            <div><span className="font-semibold">Término:</span> {dataBR(paraISO(fimPrevistoData))}</div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Dias total previsto</div><div className="text-lg font-bold text-slate-900">{diasTotaisPrevistos}</div><div className="text-[10px] text-slate-500">Com sábados e domingos</div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Dias úteis previsto</div><div className="text-lg font-bold text-slate-900">{diasUteisPrevistos}</div><div className="text-[10px] text-slate-500">Sem sábados e domingos</div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Dias trabalhados</div><div className="text-lg font-bold text-slate-900">{diasTrabalhados}</div><div className="text-[10px] text-slate-500">Com diário trabalhado</div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">% andamento</div><div className="text-lg font-bold text-slate-900">{percentual(andamentoAtual)}</div><div className="text-[10px] text-slate-500">Média física</div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Situação</div><div className="text-lg font-bold text-slate-900">{prazoStatus}</div><div className="text-[10px] text-slate-500">Previsto x realizado</div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Serviços</div><div className="text-lg font-bold text-slate-900">{cronograma.length}</div><div className="text-[10px] text-slate-500">Atividades</div></div>
        </div>

        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-orange-400" /> Previsto</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-lime-400" /> Executado</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-red-500" /> Dia sem trabalho</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-red-100 ring-1 ring-red-300" /> Sábado/domingo</span>
        </div>
      </div>

      <div className="grid grid-cols-[300px_minmax(0,1fr)]">
        <div className="z-20 bg-white shadow-[8px_0_10px_-10px_rgba(15,23,42,0.45)]">
          <div className="h-7 border-b border-slate-200 bg-white" />
          <div className="flex h-10 items-center border border-slate-300 bg-slate-950 px-3 text-left text-sm font-bold text-white">Serviço</div>
          <div className="flex h-8 items-center border border-slate-200 bg-cyan-50 px-3 text-left text-xs font-semibold text-slate-600">Dia da obra</div>

          {cronograma.map((item) => (
            <div key={item.servico.id} className="h-[72px] border border-slate-200 bg-white px-3 py-3">
              <div className="font-semibold text-slate-900">{item.servico.nome}</div>
              <div className="mt-1 text-xs text-slate-500">
                Prev.: {item.diasPrevistos} dia(s) • Exec.: {item.diasExecutados} dia(s) • Andamento: {percentual(item.avancoReal)}
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0 bg-white">
          <div className="border-b border-slate-200 bg-white px-2 py-1">
            <div
              ref={barraTopoRef}
              onScroll={(event) => sincronizarTopo(event.currentTarget.scrollLeft)}
              className="h-5 overflow-x-auto overflow-y-hidden"
              title="Role aqui para navegar pelos dias do cronograma"
            >
              <div style={{ width: `${larguraDias}px`, height: 1 }} />
            </div>
          </div>

          <div
            ref={graficoDiasRef}
            onScroll={(event) => sincronizarDias(event.currentTarget.scrollLeft)}
            className="overflow-x-auto overflow-y-visible bg-white"
          >
            <div style={{ width: `${larguraDias}px` }}>
              <div className="grid h-10" style={{ gridTemplateColumns: `repeat(${dias.length}, 38px)` }}>
                {dias.map((dia) => {
                  const fimSemana = ehFimDeSemana(dia.data);
                  return (
                    <div key={dia.indice} className={`flex items-center justify-center border border-slate-300 px-1 text-center text-[11px] font-bold ${fimSemana ? "bg-red-700 text-white" : "bg-slate-950 text-white"}`}>
                      {dia.numero}
                    </div>
                  );
                })}
              </div>

              <div className="grid h-8" style={{ gridTemplateColumns: `repeat(${dias.length}, 38px)` }}>
                {dias.map((dia) => {
                  const fimSemana = ehFimDeSemana(dia.data);
                  return (
                    <div
                      key={dia.indice}
                      className={`flex items-center justify-center border border-slate-200 px-1 text-center text-[10px] font-medium ${fimSemana ? "bg-red-100 text-red-700" : "bg-cyan-50 text-slate-600"}`}
                      title={`${dataBR(paraISO(dia.data))} - ${nomeDiaSemana(dia.data)}`}
                    >
                      {String(dia.data.getDate()).padStart(2, "0")}
                    </div>
                  );
                })}
              </div>

              {cronograma.map((item) => {
                const inicioServico = dataMeioDia(item.inicioPrevisto);
                const producoesDoServico = producoes.filter((producao) => producao.servico_id === item.servico.id);
                const datasProduzidas = producoesDoServico.map((producao) => producao.data).sort();
                const primeiraDataProducao = datasProduzidas[0] || "";
                const ultimaDataProducao = datasProduzidas[datasProduzidas.length - 1] || "";

                return (
                  <div key={item.servico.id} className="grid h-[72px]" style={{ gridTemplateColumns: `repeat(${dias.length}, 38px)` }}>
                    {dias.map((dia) => {
                      const fimSemana = ehFimDeSemana(dia.data);
                      const dataDia = paraISO(dia.data);
                      const motivoSemTrabalho = diariosSemTrabalho.get(dataDia);
                      const dentroIntervalo = dia.indice >= item.inicioOffset && dia.indice <= item.fimOffset;
                      const diaUtilDoServico = dentroIntervalo && !fimSemana && !motivoSemTrabalho;
                      const ordemUtil = diaUtilDoServico ? contarDiasUteisInclusivo(inicioServico, dia.data) : 0;
                      const percentualPrevistoDia = diaUtilDoServico ? Math.min((ordemUtil / item.diasPrevistos) * 100, 100) : 0;
                      const quantidadeExecutadaAteDia = soma(producoesDoServico.filter((producao) => producao.data <= dataDia).map((producao) => producao.quantidade));
                      const percentualExecutadoDia = item.servico.qtd_prevista > 0 ? Math.min((quantidadeExecutadaAteDia / item.servico.qtd_prevista) * 100, 100) : 0;
                      const dentroExecutado = diaUtilDoServico && percentualExecutadoDia > 0 && dataDia >= primeiraDataProducao && dataDia <= ultimaDataProducao;
                      const semTrabalhoClicavel = Boolean(motivoSemTrabalho && !fimSemana && dentroIntervalo);
                      const tituloSemTrabalho = motivoSemTrabalho ? `${dataBR(dataDia)} • sem trabalho: ${motivoSemTrabalho}` : "";

                      return (
                        <div key={dia.indice} className={`h-[72px] border border-slate-200 px-0 py-0 align-top ${motivoSemTrabalho ? "bg-red-100" : fimSemana ? "bg-red-50" : "bg-white"}`}>
                          <div className="grid h-full grid-rows-2">
                            <button
                              type="button"
                              disabled={!semTrabalhoClicavel}
                              onClick={() => {
                                if (semTrabalhoClicavel) {
                                  setDiarioCronogramaSelecionado({ data: dataDia, servicoId: item.servico.id, servicoNome: item.servico.nome });
                                }
                              }}
                              className={`${motivoSemTrabalho && dentroIntervalo ? semTrabalhoClicavel ? "bg-red-500 hover:ring-2 hover:ring-cyan-500 cursor-pointer" : "bg-red-500 cursor-default" : diaUtilDoServico ? "bg-orange-400" : "bg-transparent"} h-full w-full`}
                              title={semTrabalhoClicavel ? `${tituloSemTrabalho} • clique para abrir o diário de obra` : motivoSemTrabalho && dentroIntervalo ? tituloSemTrabalho : diaUtilDoServico ? `${item.servico.nome} • ${dataBR(dataDia)} • previsto acumulado: ${percentual(percentualPrevistoDia)}` : fimSemana ? `${dataBR(dataDia)} • sábado/domingo não contado` : ""}
                              aria-label={semTrabalhoClicavel ? `Abrir diário sem trabalho de ${dataBR(dataDia)}` : "Sem ação"}
                            />
                            <button
                              type="button"
                              disabled={!dentroExecutado && !semTrabalhoClicavel}
                              onClick={() => {
                                if (dentroExecutado || semTrabalhoClicavel) {
                                  setDiarioCronogramaSelecionado({ data: dataDia, servicoId: item.servico.id, servicoNome: item.servico.nome });
                                }
                              }}
                              className={`${motivoSemTrabalho && dentroIntervalo ? semTrabalhoClicavel ? "bg-red-500 hover:ring-2 hover:ring-cyan-500 cursor-pointer" : "bg-red-500 cursor-default" : dentroExecutado ? "bg-lime-400 hover:ring-2 hover:ring-cyan-500 cursor-pointer" : "bg-transparent cursor-default"} h-full w-full`}
                              title={semTrabalhoClicavel ? `${tituloSemTrabalho} • clique para abrir o diário de obra` : motivoSemTrabalho && dentroIntervalo ? tituloSemTrabalho : dentroExecutado ? `${item.servico.nome} • ${dataBR(dataDia)} • clique para abrir o diário de obra` : fimSemana ? `${dataBR(dataDia)} • sábado/domingo não contado` : ""}
                              aria-label={dentroExecutado || semTrabalhoClicavel ? `Abrir diário de obra de ${dataBR(dataDia)} - ${item.servico.nome}` : "Sem produção lançada neste dia"}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {diarioCronogramaSelecionado && (() => {
        const diariosDoDia = diarios.filter((diario) => diario.data === diarioCronogramaSelecionado.data);
        const producoesDoDia = producoes.filter((producao) => producao.data === diarioCronogramaSelecionado.data && producao.servico_id === diarioCronogramaSelecionado.servicoId);
        const servico = cronograma.find((item) => item.servico.id === diarioCronogramaSelecionado.servicoId)?.servico;
        const quantidadeDia = soma(producoesDoDia.map((producao) => producao.quantidade));
        const percentualDia = servico && servico.qtd_prevista > 0 ? (quantidadeDia / servico.qtd_prevista) * 100 : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Diário de obra — {dataBR(diarioCronogramaSelecionado.data)}</h2>
                  <p className="text-sm text-slate-500">{diarioCronogramaSelecionado.servicoNome}</p>
                </div>
                <button type="button" onClick={() => setDiarioCronogramaSelecionado(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">×</button>
              </div>

              <div className="grid gap-4 p-5">
                {diariosDoDia.some((diario) => /sem trabalho/i.test(String(diario.equipe_resumo || "")) || /sem trabalho/i.test(String(diario.servicos_executados || ""))) && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-bold uppercase text-red-700">Dia sem trabalho</p>
                    <p className="mt-1 text-sm text-red-800">
                      Motivo: {diariosDoDia.find((diario) => /sem trabalho/i.test(String(diario.equipe_resumo || "")) || /sem trabalho/i.test(String(diario.servicos_executados || "")))?.ocorrencias || "Motivo não informado."}
                    </p>
                  </div>
                )}

                {producoesDoDia.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-700">Produção do serviço no dia</p>
                    <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                      <div><b>Serviço:</b> {diarioCronogramaSelecionado.servicoNome}</div>
                      <div><b>Quantidade do dia:</b> {numero(quantidadeDia)} {servico?.unidade || ""}</div>
                      <div><b>% do serviço no dia:</b> {percentual(percentualDia)}</div>
                    </div>
                  </div>
                )}

                {diariosDoDia.length > 0 ? (
                  diariosDoDia.map((diario) => {
                    const producoesVinculadas = producoes.filter((producao) => producao.diario_id === diario.id);
                    return (
                      <article key={diario.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-950">Diário lançado</h3>
                            <p className="text-xs text-slate-500">{diario.horario_inicio || "--:--"} às {diario.horario_termino || "--:--"} • {diario.clima || "Clima não informado"}</p>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-700">
                          <p><b>Equipe:</b> {diario.equipe_resumo || "-"}</p>
                          <p><b>Serviços executados:</b> {diario.servicos_executados || "-"}</p>
                          <p><b>Ocorrências:</b> {diario.ocorrencias || "-"}</p>
                          <p><b>Responsável:</b> {diario.responsavel_lancamento || "-"}</p>
                        </div>

                        {producoesVinculadas.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Produtividade lançada neste diário</p>
                            <div className="grid gap-2">
                              {producoesVinculadas.map((producao) => {
                                const servicoProducao = cronograma.find((item) => item.servico.id === producao.servico_id)?.servico;
                                const percentualProducao = servicoProducao && servicoProducao.qtd_prevista > 0 ? (producao.quantidade / servicoProducao.qtd_prevista) * 100 : 0;
                                return (
                                  <div key={producao.id} className="rounded-xl bg-white p-3 text-sm text-slate-700">
                                    <b>{servicoProducao?.nome || "Serviço"}</b> • {numero(producao.quantidade)} {servicoProducao?.unidade || ""} • {percentual(percentualProducao)} • {producao.pessoas} pessoa(s) • {numero(producao.horas, 1)}h
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {fotos.filter((foto) => foto.diario_id === diario.id).length > 0 && (
                          <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                            <p className="mb-2 text-xs font-bold uppercase text-cyan-700">Fotos do diário</p>
                            <div className="grid gap-2">
                              {fotos.filter((foto) => foto.diario_id === diario.id).map((foto, index) => (
                                <a
                                  key={foto.id}
                                  href={foto.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
                                >
                                  <span>{foto.descricao || `Foto ${index + 1}`}</span>
                                  <span className="inline-flex items-center gap-1">Abrir foto <ExternalLink size={14} /></span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <Empty text="Não encontrei diário de obra lançado para esta data." />
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ResumoServicosCronograma({
  cronograma,
  compacto = false,
}: {
  cronograma: {
    servico: Servico;
    diasPrevistos: number;
    diasExecutados: number;
    inicioOffset: number;
    fimOffset: number;
    inicioPrevisto: string;
    fimPrevisto: string;
    relacao: string;
    avancoPrevisto: number;
    avancoReal: number;
    diferenca: number;
    situacao: string;
  }[];
  compacto?: boolean;
}) {
  if (!cronograma.length) {
    return <Empty text="Nenhum serviço cadastrado no cronograma." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="hidden grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr] gap-3 bg-slate-100 px-4 py-3 text-xs font-bold uppercase text-slate-500 md:grid">
        <span>Serviço</span>
        <span>Início previsto</span>
        <span>Término previsto</span>
        <span className="text-right">Andamento</span>
        <span className="text-right">Situação</span>
      </div>

      <div className="divide-y divide-slate-100">
        {cronograma.map((item) => (
          <article key={item.servico.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr] md:items-center">
            <div>
              <div className="font-bold text-slate-950">{item.servico.nome}</div>
              <div className="mt-1 text-xs text-slate-500">
                {item.servico.categoria || "Sem categoria"} • {item.diasPrevistos} dia(s) previsto(s)
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase text-slate-400 md:hidden">Início previsto: </span>
              <b className="text-slate-700">{dataBR(item.inicioPrevisto)}</b>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase text-slate-400 md:hidden">Término previsto: </span>
              <b className="text-slate-700">{dataBR(item.fimPrevisto)}</b>
            </div>

            <div className="md:text-right">
              <span className="text-xs font-semibold uppercase text-slate-400 md:hidden">Andamento: </span>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{percentual(item.avancoReal)}</span>
            </div>

            <div className="md:text-right">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                item.situacao === "Atrasado"
                  ? "bg-red-50 text-red-700"
                  : item.situacao === "Adiantado"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
              }`}>
                {item.situacao}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TabelaAvanco({
  avancos,
  onEditarServico,
  onExcluirServico,
  relacoesDoServico,
}: {
  avancos: { servico: Servico; executado: number; falta: number; avanco: number; diasExecutados: number }[];
  onEditarServico?: (servico: Servico) => void;
  onExcluirServico?: (id: string, nome: string) => void | Promise<void>;
  relacoesDoServico?: (servico: Servico) => { predecessores: string[]; sucessores: string[]; simultaneos: string[] };
}) {
  if (avancos.length === 0) return <Empty text="Cadastre serviços para acompanhar o avanço físico." />;

  return (
    <div className="grid gap-3">
      {avancos.map(({ servico, executado, falta, avanco, diasExecutados }) => {
        const relacoes = relacoesDoServico?.(servico);
        return (
          <article key={servico.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-slate-950">{servico.nome}</strong>
                  {servico.categoria && <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">{servico.categoria}</span>}
                </div>
                {relacoesDoServico && (
                  <div className="mt-2 grid gap-1 text-[11px] text-slate-500 md:grid-cols-3">
                    <span><b>Predecessor:</b> {textoLista(relacoes?.predecessores || [])}</span>
                    <span><b>Sucessor:</b> {textoLista(relacoes?.sucessores || [])}</span>
                    <span><b>Ao mesmo tempo:</b> {textoLista(relacoes?.simultaneos || [])}</span>
                  </div>
                )}
              </div>

              {(onEditarServico || onExcluirServico) && (
                <div className="flex shrink-0 gap-1">
                  {onEditarServico && (
                    <button
                      type="button"
                      title="Editar serviço"
                      aria-label={`Editar serviço ${servico.nome}`}
                      onClick={() => onEditarServico(servico)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {onExcluirServico && (
                    <button
                      type="button"
                      title="Excluir serviço"
                      aria-label={`Excluir serviço ${servico.nome}`}
                      onClick={() => onExcluirServico(servico.id, servico.nome)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
              <MiniInfo label="Previsto" value={`${numero(servico.qtd_prevista)} ${servico.unidade}`} />
              <MiniInfo label="Executado" value={`${numero(executado)} ${servico.unidade}`} />
              <MiniInfo label="Falta" value={`${numero(falta)} ${servico.unidade}`} />
              <MiniInfo label="Avanço" value={percentual(avanco)} strong />
              <MiniInfo label="Dias previstos" value={String(servico.dias_previstos || 1)} />
              <MiniInfo label="Dias executados" value={String(diasExecutados)} strong />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniInfo({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-sm ${strong ? "font-black text-slate-950" : "font-semibold text-slate-700"}`}>{value}</div>
    </div>
  );
}
