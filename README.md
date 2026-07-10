# Sistema Controle de Obra - V32

Versão V32 com melhorias no Diário de Obra e no Cronograma Físico.

## Alterações da V32

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


## Alterações da V32

- Em Produção do dia, o lançamento agora é feito por **Porcentagem executada (%)**.
- O sistema calcula automaticamente a quantidade executada com base na quantidade prevista do serviço.
- Fórmula: quantidade calculada = quantidade prevista × porcentagem executada ÷ 100.
- Avanço físico, produtividade e cronograma continuam sendo atualizados automaticamente.


## Alterações da V32

- Em Produção do dia, removido o campo Local.
- O campo Nº de pessoas agora é preenchido automaticamente pela equipe presente no Diário de Obra selecionado.
- Se o diário estiver como “Equipe completa”, o sistema usa a quantidade de membros cadastrados na equipe da obra.
- Se o diário estiver como equipe incompleta, o sistema tenta contar os nomes digitados.
- Se o diário estiver como “Sem trabalho”, o lançamento de produção é bloqueado.
- O serviço vem automaticamente selecionado conforme o cronograma físico previsto para a data escolhida.


## Alterações da V32

- Em Produção do dia, o campo “Vincular ao diário” agora oculta automaticamente os diários que já foram vinculados a uma produção.
- A opção “Sem vínculo” continua disponível.
- Ao salvar uma produção vinculada a um diário, o sistema limpa a seleção para evitar reutilização do mesmo diário.


## Alterações da V32

- Na Produção do dia, abaixo do campo **Serviço previsto para a data**, agora aparece o **andamento atual do serviço selecionado** em porcentagem.
- O valor muda automaticamente ao trocar o serviço selecionado.


## Alterações da V32

- Removidos textos explicativos longos do menu Diário de Obra.
- No gráfico do Cronograma Físico, ao passar o mouse no quadrado laranja aparece a porcentagem prevista acumulada daquele serviço naquele dia.
- No gráfico do Cronograma Físico, ao passar o mouse no quadrado verde aparece a porcentagem executada acumulada daquele serviço naquele dia.


## Alterações da V32

- Em **Vincular ao diário**, os diários marcados como **Sem trabalho** não aparecem mais na lista.
- Isso vale para sábado sem trabalho, domingo sem trabalho e qualquer outro dia salvo como dia sem trabalho.
- A lista continua mostrando apenas diários trabalhados que ainda não foram vinculados a uma produção.


## Alterações da V32

- Corrigido o gráfico do Cronograma Físico.
- A barra verde agora não é mais distribuída automaticamente pela porcentagem do serviço.
- A barra verde passa a respeitar as datas reais dos lançamentos de produção/produtividade.
- Se a produção foi lançada até o dia 07, o gráfico não pinta os dias 08 e 09 de verde.
- Ao passar o mouse no verde, aparece o executado acumulado real até aquele dia.


## Alterações da V32

- A Produção do dia agora é lançada junto com o Diário de Obra.
- Removida a tela separada de Produção do dia.
- Removidos os campos Data e Vincular ao diário da produção, pois a produção usa a própria data e o vínculo do Diário salvo.
- O serviço previsto para a data fica dentro do formulário do Diário de Obra.
- O sistema seleciona automaticamente o serviço previsto no cronograma físico da data.
- Se o serviço previsto já estiver 100% concluído, o sistema seleciona o próximo serviço pendente, mesmo que ele ainda não tenha começado na programação, indicando adiantamento.
- O lançamento continua sendo por porcentagem executada.
- O número de pessoas vem automaticamente da equipe presente no diário.
- As horas trabalhadas vêm automaticamente do horário de início e término do diário.


## Alterações da V32

- Corrigido o aviso do React ao alternar o Diário de Obra entre dia trabalhado e dia sem trabalho.
- Ajustado o componente de campos do formulário para não trocar input controlado por não controlado.
- Adicionada separação interna entre o formulário de dia trabalhado e sem trabalho para evitar reaproveitamento incorreto dos campos.


## Alterações da V32

- No Gráfico do Cronograma Físico, os dias salvos no Diário de Obra como **Sem trabalho** aparecem em vermelho dentro da atividade.
- Ao passar o mouse no dia vermelho, aparece o motivo informado no diário sem trabalho.
- A marcação vale para sábado, domingo e qualquer outro dia salvo como dia sem trabalho.


## Alterações da V32

- No menu Cronograma Físico, o gráfico agora fica dentro de uma área com rolagem própria.
- A página não cresce mais por causa do gráfico grande.
- Os demais itens da página continuam visíveis, como indicadores, resumo e tabela abaixo.
- O cabeçalho do gráfico fica fixo dentro da área de rolagem.


## Alterações da V32

- Corrigida a rolagem do Gráfico do Cronograma Físico.
- A rolagem horizontal agora fica dentro da caixa do gráfico, e não mais na página inteira.
- A área principal da página foi ajustada para não ser empurrada pela largura do cronograma.
- Os demais itens da página permanecem visíveis.


## Alterações da V32

- Adicionado botão **Gerar PDF A2** no menu Cronograma Físico.
- O botão gera automaticamente o PDF do gráfico em tamanho **A2 horizontal**.
- O arquivo é salvo pelo navegador como download.
- Adicionadas as dependências `html2canvas` e `jspdf` para geração do PDF.
- Após substituir pela V32, rode `INSTALAR.bat` para instalar as novas dependências.


## Alterações da V32

- Corrigida a geração do PDF A2 do cronograma físico.
- O PDF agora captura o **gráfico completo**, não apenas a parte visível na tela.
- A exportação usa uma cópia temporária do conteúdo completo do cronograma para evitar cortes.


## Alterações da V32

- O botão de exportação agora gera o cronograma em **PDF A1**.
- O PDF passa a incluir um resumo com: início previsto, término previsto, dias total da obra previsto (com sábados e domingos), dias úteis previsto, dias trabalhados, % de andamento e situação do prazo.
- O gráfico completo continua sendo exportado, sem cortar apenas a parte visível da tela.


## Alterações da V32

- Em **Serviços e avanço físico**, a visualização foi reorganizada em cards compactos para caber tudo sem barra de rolagem horizontal.
- Os dados de previsto, executado, falta, avanço, dias previstos e dias executados continuam aparecendo.
- Ao clicar no lápis para editar serviço, agora abre uma telinha/modal na própria tela.
- O botão **OK** salva a edição e fecha a telinha automaticamente.


## Alterações da V32

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


## Alterações da V32

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
