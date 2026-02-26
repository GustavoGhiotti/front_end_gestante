# GestaCare — Perfil Médico (Frontend)

## Como rodar

```bash
# 1. Entre na pasta do frontend
cd "front_end_gestante"

# 2. Instale as dependências (use npm, yarn ou pnpm)
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev

# 4. Acesse http://localhost:5173/login
```

### Credenciais de teste

| Perfil   | E-mail              | Senha   |
|----------|---------------------|---------|
| Médico   | medico@example.com  | senha123 |
| Gestante | maria@example.com   | senha123 |

> O backend precisa estar rodando para o login funcionar. Veja `back_end_gestante/README.md`.
> Depois do login o médico é redirecionado para `/doctor`.

---

## Rotas do perfil médico

| URL                        | Componente           | Descrição                     |
|----------------------------|----------------------|-------------------------------|
| `/doctor`                  | DoctorDashboard      | Dashboard principal (triage)  |
| `/doctor/patients/:id`     | PatientDetails       | Detalhes do paciente          |
| `/doctor/patients/:id?tab=analise`      | — | Aba análise (padrão)         |
| `/doctor/patients/:id?tab=relatos`      | — | Aba relatos                  |
| `/doctor/patients/:id?tab=sinais-vitais`| — | Aba sinais vitais            |
| `/doctor/patients/:id?tab=prontuario`   | — | Aba prontuário               |
| `/doctor/patients/:id?tab=medicamentos` | — | Aba medicamentos             |

Rotas legadas `/medico/dashboard` e `/medico/paciente/:id` redirecionam para o novo design.

---

## Estrutura de arquivos criados

```
src/
├── lib/
│   └── utils.ts                     # Helpers: cn(), formatDate(), pctChange()…
├── types/
│   └── doctor.ts                    # Tipos TypeScript do perfil médico
├── mocks/
│   └── doctorData.ts                # Dados mock + funções async simuladas
├── components/
│   ├── ui/
│   │   ├── Badge.tsx                # Badge reutilizável (variantes)
│   │   ├── Card.tsx                 # Card + CardHeader + CardBody
│   │   ├── Tabs.tsx                 # Tabs acessíveis (ARIA, teclado)
│   │   ├── Modal.tsx                # Modal com portal + foco preso
│   │   └── Spinner.tsx              # Spinner + PageSpinner
│   ├── doctor/
│   │   ├── AlertBadge.tsx           # Badge de nível de atenção
│   │   ├── PatientList.tsx          # Tabela (desktop) + cards (mobile)
│   │   ├── PatientHeader.tsx        # Header do paciente com flags
│   │   ├── VitalsTrendCard.tsx      # Card com sparkline SVG
│   │   └── AssociatePatientModal.tsx# Modal de associação de paciente
│   └── layout/
│       └── DoctorLayout.tsx         # Layout com sidebar dark + main area
└── pages/
    └── doctor/
        ├── DoctorDashboard.tsx      # Dashboard (KPIs + lista + modal)
        └── PatientDetails.tsx       # Detalhes (5 abas completas)
```

---

## Sistema visual

| Token            | Valor                        |
|------------------|------------------------------|
| Cor primária     | Teal (`#0d9488` — brand-600) |
| Background       | Slate-50 (`#f8fafc`)         |
| Surface (cards)  | White                        |
| Texto primário   | Slate-900                    |
| Texto secundário | Slate-500                    |
| Alerta alto      | Red-600 + bg-red-50          |
| Alerta médio     | Amber-600 + bg-amber-50      |
| Alerta baixo     | Blue-600 + bg-blue-50        |
| OK               | Emerald-600 + bg-emerald-50  |
| Fonte            | Inter (Google Fonts)         |

---

## Dados mock disponíveis (6 pacientes)

| ID  | Paciente                    | IG    | Alerta  |
|-----|-----------------------------|-------|---------|
| p1  | Maria da Silva Santos       | 28s3d | 🔴 Alta  |
| p2  | Ana Clara Rodrigues         | 32s1d | 🟡 Média |
| p3  | Paula Fernanda Costa        | 20s5d | ⚪ Nenhum|
| p4  | Luciana Aparecida Ferreira  | 36s   | 🔴 Alta  |
| p5  | Beatriz Oliveira Mendes     | 16s2d | 🔵 Baixa |
| p6  | Carla Regina Mendes         | 24s4d | 🟡 Média |

---

## Acessibilidade implementada

- Navegação por teclado nos tabs (←/→/Home/End)
- `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- Modal com foco preso, fecha com Escape, backdrop com `aria-hidden`
- `aria-label` em todos os botões de ação
- Foco visível (`outline` brand-600) em todos os elementos interativos
- Skip-link "Pular para conteúdo" visível no foco
- Spinner com `role="status"` e `aria-label`
- Cores nunca são o único indicador (ícone + texto acompanha)
- `<time dateTime>` em todas as datas

---

## Disclaimer da IA (não negociável)

Toda exibição do "Resumo do assistente" inclui:

> *"Este resumo é gerado automaticamente com base nos dados registrados. Não substitui avaliação clínica nem emite diagnóstico."*

Variações detectadas são **matemáticas** (ex: "+15,6% em 7 dias"), não clínicas.
