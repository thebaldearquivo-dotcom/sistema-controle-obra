# Sistema Controle de Obra - V55

Versão V55 com melhorias no Diário de Obra e no Cronograma Físico.

## Alterações da V55

- No lançamento do Diário de Obra, ao selecionar sábado ou domingo, aparece a opção de salvar como sábado/domingo sem trabalho ou marcar como trabalhado.
- Nos dias úteis, foi adicionada a opção Dia sem trabalho.
- Quando marcar sem trabalho, os campos de clima, equipe, serviços e ocorrências somem.
- O diário sem trabalho é salvo e aparece no histórico como Sem trabalho, com motivo informado.
- No Cronograma Físico, sábados e domingos aparecem em vermelho.
- A contagem dos dias previstos dos serviços pula sábado e domingo.
- Exemplo: serviço iniciado quinta com 5 dias conta quinta, sexta, segunda, terça e quarta.

## Como executar

1. Execute `INSTALAR.bat`.
2. Execute `EXECUTAR.bat`.
3. Acesse `http://localhost:3005`.

Não precisa rodar SQL novo nesta versão.


## Alterações da V55

- Em Produção do dia, o lançamento agora é feito por **Porcentagem executada (%)**.
- O sistema calcula automaticamente a quantidade executada com base na quantidade prevista do serviço.
- Fórmula: quantidade calculada = quantidade prevista × porcentagem executada ÷ 100.
- Avanço físico, produtividade e cronograma continuam sendo atualizados automaticamente.


## Alterações da V55

- Em Produção do dia, removido o campo Local.
- O campo Nº de pessoas agora é preenchido automaticamente pela equipe presente no Diário de Obra selecionado.
- Se o diário estiver como “Equipe completa”, o sistema usa a quantidade de membros cadastrados na equipe da obra.
- Se o diário estiver como equipe incompleta, o sistema tenta contar os nomes digitados.
- Se o diário estiver como “Sem trabalho”, o lançamento de produção é bloqueado.
- O serviço vem automaticamente selecionado conforme o cronograma físico previsto para a data escolhida.


## Alterações da V55

- Em Produção do dia, o campo “Vincular ao diário” agora oculta automaticamente os diários que já foram vinculados a uma produção.
- A opção “Sem vínculo” continua disponível.
- Ao salvar uma produção vinculada a um diário, o sistema limpa a seleção para evitar reutilização do mesmo diário.


## Alterações da V55

- Na Produção do dia, abaixo do campo **Serviço previsto para a data**, agora aparece o **andamento atual do serviço selecionado** em porcentagem.
- O valor muda automaticamente ao trocar o serviço selecionado.


## Alterações da V55

- Removidos textos explicativos longos do menu Diário de Obra.
- No gráfico do Cronograma Físico, ao passar o mouse no quadrado laranja aparece a porcentagem prevista acumulada daquele serviço naquele dia.
- No gráfico do Cronograma Físico, ao passar o mouse no quadrado verde aparece a porcentagem executada acumulada daquele serviço naquele dia.


## Alterações da V55

- Em **Vincular ao diário**, os diários marcados como **Sem trabalho** não aparecem mais na lista.
- Isso vale para sábado sem trabalho, domingo sem trabalho e qualquer outro dia salvo como dia sem trabalho.
- A lista continua mostrando apenas diários trabalhados que ainda não foram vinculados a uma produção.


## Alterações da V55

- Corrigido o gráfico do Cronograma Físico.
- A barra verde agora não é mais distribuída automaticamente pela porcentagem do serviço.
- A barra verde passa a respeitar as datas reais dos lançamentos de produção/produtividade.
- Se a produção foi lançada até o dia 07, o gráfico não pinta os dias 08 e 09 de verde.
- Ao passar o mouse no verde, aparece o executado acumulado real até aquele dia.


## Alterações da V55

- A Produção do dia agora é lançada junto com o Diário de Obra.
- Removida a tela separada de Produção do dia.
- Removidos os campos Data e Vincular ao diário da produção, pois a produção usa a própria data e o vínculo do Diário salvo.
- O serviço previsto para a data fica dentro do formulário do Diário de Obra.
- O sistema seleciona automaticamente o serviço previsto no cronograma físico da data.
- Se o serviço previsto já estiver 100% concluído, o sistema seleciona o próximo serviço pendente, mesmo que ele ainda não tenha começado na programação, indicando adiantamento.
- O lançamento continua sendo por porcentagem executada.
- O número de pessoas vem automaticamente da equipe presente no diário.
- As horas trabalhadas vêm automaticamente do horário de início e término do diário.


## Alterações da V55

- Corrigido o aviso do React ao alternar o Diário de Obra entre dia trabalhado e dia sem trabalho.
- Ajustado o componente de campos do formulário para não trocar input controlado por não controlado.
- Adicionada separação interna entre o formulário de dia trabalhado e sem trabalho para evitar reaproveitamento incorreto dos campos.


## Alterações da V55

- No Gráfico do Cronograma Físico, os dias salvos no Diário de Obra como **Sem trabalho** aparecem em vermelho dentro da atividade.
- Ao passar o mouse no dia vermelho, aparece o motivo informado no diário sem trabalho.
- A marcação vale para sábado, domingo e qualquer outro dia salvo como dia sem trabalho.


## Alterações da V55

- No menu Cronograma Físico, o gráfico agora fica dentro de uma área com rolagem própria.
- A página não cresce mais por causa do gráfico grande.
- Os demais itens da página continuam visíveis, como indicadores, resumo e tabela abaixo.
- O cabeçalho do gráfico fica fixo dentro da área de rolagem.


## Alterações da V55

- Corrigida a rolagem do Gráfico do Cronograma Físico.
- A rolagem horizontal agora fica dentro da caixa do gráfico, e não mais na página inteira.
- A área principal da página foi ajustada para não ser empurrada pela largura do cronograma.
- Os demais itens da página permanecem visíveis.


## Alterações da V55

- Adicionado botão **Gerar PDF A2** no menu Cronograma Físico.
- O botão gera automaticamente o PDF do gráfico em tamanho **A2 horizontal**.
- O arquivo é salvo pelo navegador como download.
- Adicionadas as dependências `html2canvas` e `jspdf` para geração do PDF.
- Após substituir pela V55, rode `INSTALAR.bat` para instalar as novas dependências.


## Alterações da V55

- Corrigida a geração do PDF A2 do cronograma físico.
- O PDF agora captura o **gráfico completo**, não apenas a parte visível na tela.
- A exportação usa uma cópia temporária do conteúdo completo do cronograma para evitar cortes.


## Alterações da V55

- O botão de exportação agora gera o cronograma em **PDF A1**.
- O PDF passa a incluir um resumo com: início previsto, término previsto, dias total da obra previsto (com sábados e domingos), dias úteis previsto, dias trabalhados, % de andamento e situação do prazo.
- O gráfico completo continua sendo exportado, sem cortar apenas a parte visível da tela.


## Alterações da V55

- Em **Serviços e avanço físico**, a visualização foi reorganizada em cards compactos para caber tudo sem barra de rolagem horizontal.
- Os dados de previsto, executado, falta, avanço, dias previstos e dias executados continuam aparecendo.
- Ao clicar no lápis para editar serviço, agora abre uma telinha/modal na própria tela.
- O botão **OK** salva a edição e fecha a telinha automaticamente.


## Alterações da V55

- Dashboard simplificado para mostrar somente:
  - andamento da obra;
  - dias total previsto;
  - dias trabalhados previstos, sem contar sábado e domingo;
  - situação do prazo;
  - dias em andamento.
- Removidos do Dashboard os cartões de fotos, produções, produtividade média, avanço por serviço e últimos diários.
- Adicionado botão **Abrir resumo do diário** no Dashboard.
- Criada tela interna **Resumo do Diário de Obra** com todos os diários cadastrados.
- O resumo mostra dias trabalhados, dias sem trabalho, ocorrências, produções vinculadas e fotos.


## Alterações da V55

- Acesso por login e senha removido; o sistema agora abre direto.
- Removidos os botões/menus **Materiais** e **Relatórios** do menu lateral.
- Abaixo de **Resumo do Diário de Obra**, foi adicionado o **Resumo dos Serviços**.
- O resumo dos serviços mostra:
  - nome do serviço;
  - percentual de andamento;
  - data prevista de início;
  - data prevista de término;
  - dias previstos;
  - situação.
- A tela **Resumo do Diário de Obra** também mostra o resumo dos serviços antes da lista dos diários.


## Alterações da V55

- No Dashboard, o prazo agora vem do Cronograma Físico.
- O Dashboard mostra:
  - dias corridos previstos;
  - dias úteis previstos, sem contar sábado e domingo;
  - andamento da obra;
  - situação do prazo;
  - dias em andamento.
- O Resumo dos Serviços foi alterado para formato de lista compacta.
- Cada troca de menu agora remonta a página ativa, deixando a navegação mais leve e separada visualmente.


## Alterações da V55

- Criada estrutura de rotas separadas no Next.js:
  - `app/page.tsx`
  - `app/dashboard/page.tsx`
  - `app/obras/page.tsx`
  - `app/servicos/page.tsx`
  - `app/diario/page.tsx`
  - `app/cronograma/page.tsx`
  - `app/equipe/page.tsx`
- Criados componentes de entrada por tela:
  - `components/Dashboard.tsx`
  - `components/Obras.tsx`
  - `components/Servicos.tsx`
  - `components/DiarioObra.tsx`
  - `components/CronogramaFisico.tsx`
  - `components/Equipe.tsx`
  - `components/Layout.tsx`
  - `components/MenuLateral.tsx`
- O menu lateral agora navega por rotas reais, por exemplo `/dashboard`, `/obras`, `/servicos`, `/diario`, `/cronograma` e `/equipe`.
- A tela inicial `/` redireciona automaticamente para `/dashboard`.
- Foi mantido o motor principal do sistema para preservar todos os dados e funcionalidades existentes.


## Alterações da V55

- No Dashboard, o botão **Abrir resumo do diário** foi renomeado para **Abrir diário de obra**.
- O botão agora acessa a rota real `/diario`, mantendo a lógica de páginas e rotas separadas.


## Alterações da V55

- Na página Diário de Obra, o cadastro de novo diário agora fica em um botão **Novo diário de obra** que abre uma telinha/modal.
- A telinha de novo diário possui botão **OK** para confirmar.
- As fotos agora são anexadas junto com o lançamento do diário de obra, sem serem obrigatórias.
- Removido o formulário separado de **Adicionar fotos ao diário**.
- No topo da página Diário de Obra foram adicionados botões:
  - **Novo diário de obra**;
  - **Diários lançados**;
  - **Produtividade da equipe**.
- **Produtividade da equipe** agora abre em telinha/modal e é alimentada pelos lançamentos feitos no diário.
- **Diários lançados** agora abre em telinha/modal mostrando todos os diários cadastrados.
- Em **Andamento dos serviços**, os serviços foram ordenados conforme a sequência do Cronograma Físico, do início para o final.


## Alterações da V55

- Dentro de **Diários lançados**, as fotos não aparecem mais com visualização prévia.
- As fotos agora aparecem como links para clicar e abrir no Drive.
- Dentro de cada diário lançado, foi adicionada a **Produtividade do dia**.
- A produtividade do dia mostra:
  - % da obra que andou naquele dia;
  - serviço executado;
  - % executada do serviço;
  - quantidade feita com a unidade do serviço, como m², m, un etc.;
  - pessoas, horas e produtividade por homem/hora.


## Alterações da V55

- No Cronograma Físico, removida a barra de rolagem vertical do gráfico.
- Agora todos os serviços aparecem completos na tela.
- Mantida a barra de rolagem horizontal inferior para navegar pelos dias do cronograma.


## Alterações da V55

- A página **Cronograma Físico** agora tem layout próprio em tela cheia, inspirado no formato do Kanban.
- Removido o menu lateral nessa página para o cronograma ocupar a tela toda.
- Os botões de navegação ficam no topo:
  - Dashboard;
  - Obras;
  - Serviços;
  - Diário de Obra;
  - Equipe;
  - Gerar PDF A1.
- Os resumos/KPIs ficam no topo da página.
- O gráfico do cronograma físico ocupa a página toda, mantendo a barra de rolagem horizontal inferior.


## Alterações da V55

- Na página Cronograma Físico, a parte superior com botões, resumos e informações fica fixa.
- Os resumos foram compactados para caber melhor no topo.
- A barra de rolagem horizontal do cronograma foi movida para cima do cabeçalho **Serviço**, conforme solicitado.
- A rolagem horizontal agora movimenta apenas o gráfico.
- A área dos serviços do gráfico fica abaixo da parte fixa.


## Alterações da V55

- Na página Cronograma Físico, somente o topo com os botões fica fixo.
- A rolagem vertical agora movimenta toda a área abaixo do topo, incluindo resumos, informações e gráfico.
- Removida a rolagem vertical interna do gráfico.
- A barra horizontal do cronograma continua acima do cabeçalho **Serviço** e rola somente os dias do gráfico.


## Alterações da V55

- Mantida a lógica da V41: somente os botões do topo ficam fixos.
- A área abaixo do topo continua rolando normalmente, incluindo resumos, informações e gráfico.
- O Cronograma Físico foi refeito em duas áreas:
  - coluna fixa da esquerda com os serviços;
  - área da direita com os dias do cronograma e rolagem horizontal.
- Ao usar a barra horizontal de baixo, somente os dias do cronograma rolam.
- A coluna dos serviços fica fixa e visível.


## Alterações da V55

- Mantido o layout da V43.
- Adicionada uma barra de rolagem horizontal acima do gráfico, na posição indicada.
- A barra superior rola os dias do cronograma.
- A rolagem superior e a rolagem do gráfico ficam sincronizadas.
- A coluna da esquerda com os serviços permanece fixa.


## Alterações da V55

- Na página Diário de Obra, adicionado botão **Serviços concluídos**.
- Serviços com avanço de **100%** ficam ocultos do quadro principal **Andamento dos serviços**.
- Os serviços concluídos aparecem dentro da telinha/modal **Serviços concluídos**.
- O botão mostra a quantidade de serviços concluídos.


## Alterações da V55

- No lançamento do Diário de Obra, adicionada a informação de **Quantidade executada**.
- Se informar a **porcentagem executada**, a quantidade é calculada automaticamente.
- Se informar a **quantidade executada**, a porcentagem é calculada automaticamente.
- O campo mostra a unidade do serviço selecionado (m², m, un etc.).


## Alterações da V55

- Removido o texto explicativo abaixo do campo **Quantidade executada** no Diário de Obra.


## Alterações da V55

- Ajustado o layout do bloco de lançamento de produção dentro do Diário de Obra.
- Os campos de serviço, porcentagem, quantidade, número de pessoas e horas trabalhadas foram reorganizados para não ficarem embolados.
- Em larguras menores, os campos quebram em 2 colunas; em telas maiores, voltam para 4 colunas.


## Alterações da V55

- No Diário de Obra, reorganizado o bloco de lançamento da produção.
- A linha de cima agora fica com: serviço previsto, porcentagem executada e quantidade executada.
- O campo **Nº de pessoas** foi movido para a linha de baixo, ao lado de **Horas trabalhadas**.


## Alterações da V55

- Corrigido o cálculo automático entre **Porcentagem executada** e **Quantidade executada**.
- O erro estava na formatação do número, que removia zeros de números inteiros.
- Agora exemplos como estes ficam corretos:
  - 10% de 280 = 28;
  - quantidade 28 de 280 = 10%;
  - 100% de 280 = 280.


## Alterações da V55

- No Diário de Obra, abaixo do campo **Serviço previsto para a data**, o texto **Andamento atual** agora mostra também o valor executado na unidade cadastrada do serviço.
- Exemplo: `Andamento atual: 10,00% • Executado atual: 28,00 m²`.


## Alterações da V55

- No Diário de Obra, abaixo de **Serviço previsto para a data**, agora também aparece a **quantidade que falta executar** na unidade do serviço.
- Exemplo: `Falta executar: 255,00 m²`.
- Ao preencher a produção do dia, o sistema mostra uma prévia acumulada: **total executado**, **falta executar** e **andamento total** após este lançamento.
- O lançamento diário continua somando com os anteriores. Exemplo: se ontem foram 10 m² e hoje 15 m², o total acumulado passa a 25 m².
- Adicionada validação para impedir que o lançamento ultrapasse o total previsto do serviço.


## Alterações da V55

- No Cronograma Físico, os quadrinhos verdes de executado agora são clicáveis.
- Ao clicar em um quadrinho verde, abre uma telinha com o Diário de Obra referente àquele dia.
- A telinha mostra:
  - data;
  - serviço;
  - quantidade executada no dia;
  - porcentagem do serviço no dia;
  - dados do diário de obra;
  - produtividade lançada no diário.


## Alterações da V55

- No Cronograma Físico, ao clicar em um quadrinho verde, o modal do Diário de Obra agora mostra as fotos vinculadas ao diário.
- As fotos aparecem como links para clicar e abrir.
- Se o diário não tiver fotos, nada é exibido nessa área.


## Alterações da V55

- No Cronograma Físico, dias marcados como **sem trabalho** em dia útil agora são clicáveis.
- Ao clicar em um quadrinho vermelho de dia sem trabalho, abre uma telinha com o Diário de Obra daquele dia.
- A telinha mostra o motivo do dia sem trabalho.
- Sábados e domingos continuam apenas como final de semana, sem abrir modal por esse ajuste.
