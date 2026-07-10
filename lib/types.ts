export type StatusObra = "planejada" | "em_andamento" | "pausada" | "concluida";

export type Obra = {
  id: string;
  nome: string;
  cliente: string | null;
  endereco: string | null;
  responsavel: string | null;
  data_inicio: string | null;
  prazo_dias: number | null;
  status: StatusObra;
  created_at?: string;
};

export type RelacionamentoServico = "predecessor" | "sucessor" | "mesmo_tempo";

export type Servico = {
  id: string;
  obra_id: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  qtd_prevista: number;
  dias_previstos: number | null;
  relacionamento_tipo: RelacionamentoServico | null;
  servico_relacionado_id: string | null;
  created_at?: string;
};

export type MembroEquipe = {
  id: string;
  obra_id: string;
  nome: string;
  funcao: string;
  tipo: string | null;
  ativo: boolean;
  created_at?: string;
};

export type Diario = {
  id: string;
  obra_id: string;
  data: string;
  clima: string | null;
  horario_inicio: string | null;
  horario_termino: string | null;
  equipe_resumo: string | null;
  servicos_executados: string | null;
  ocorrencias: string | null;
  visitas: string | null;
  observacoes: string | null;
  responsavel_lancamento: string | null;
  created_at?: string;
};

export type Producao = {
  id: string;
  obra_id: string;
  diario_id: string | null;
  servico_id: string;
  local_execucao: string | null;
  quantidade: number;
  pessoas: number;
  horas: number;
  observacoes: string | null;
  data: string;
  created_at?: string;
};

export type Material = {
  id: string;
  obra_id: string;
  diario_id: string | null;
  data: string;
  material: string;
  unidade: string;
  quantidade: number;
  fornecedor: string | null;
  nota_fiscal: string | null;
  destino: string | null;
  created_at?: string;
};

export type FotoDiario = {
  id: string;
  diario_id: string;
  url: string;
  descricao: string | null;
  created_at?: string;
};

export type AppData = {
  obras: Obra[];
  servicos: Servico[];
  equipe: MembroEquipe[];
  diarios: Diario[];
  producoes: Producao[];
  materiais: Material[];
  fotos: FotoDiario[];
};
