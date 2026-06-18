# DESIGN.md

Este documento especifica a linguagem visual, paleta de cores, tipografia, arquitetura de componentes e as integrações tecnológicas aplicadas no **Agora na Copa 26** — o companheiro oficial de transmissões e central tática em tempo real para a Copa do Mundo FIFA 2026.

---

## 🎨 1. Conceito de Marca e Estilo Visual

O **Agora na Copa 26** captura a intensidade, velocidade e dinamismo de uma transmissão esportiva de alto padrão global. A atmosfera visual baseia-se em um contraste acentuado entre os gramados escuros e elementos luminosos neon.

- **High-Contrast / Bold**: Elementos gráficos com bordas sólidas, contrastando cores profundas do estádio com realces energéticos de canais ao vivo.
- **Glassmorphic Layering**: Uso de desfoque de fundo (`backdrop-filter: blur(20px)`) com gradientes suaves e bordas iluminadas ultrafinas (1px) para simular overlays técnicos de telas de transmissão e placares virtuais (Surface overlays).
- **Rhythm & Depth**: Transição harmônica entre componentes rígidos e bordas arredondadas moderadas (`rounded-xl` ou `12px`), impedindo uma aparência puramente industrial e trazendo ar moderno de app nativo.

---

## 🟢 2. Paleta de Cores (Stadium Broadcast Colors)

A paleta é meticulosamente calibrada para refletir um ambiente de arena real sob iluminação de projetores.

```yaml
Colors:
  surface: '#121414'             # Base escura da cabine de transmissão
  primary: '#004D2C'             # Verde Estádio profundo para contraste de dados
  secondary: '#FFD700'           # Championship Gold para momentos de destaque, CTAs e glórias
  accent-green: '#00FF85'        # Hyper-Green de status "Ao Vivo" reluzente e ativo
  text-primary: '#FFFFFF'        # Legibilidade limpa para dados rápidos
  text-muted: '#BFC9BF'          # Cinza esverdeado opaco para rótulos técnicos secundários
```

---

## ✍️ 3. Sistema de Tipografia (Scanability Hierarchy)

Três fontes foram escolhidas para garantir escaneabilidade instantânea de estatísticas secundárias e placares:

1. **Anton (Display Headings / Jersey Numbers)**
   *Uso*: Números dos jogadores no campo tático, placares volumosos e títulos imperativos. Evoca os jumbotrons e jaquetas retrôs com apelo visual de alta atitude.
2. **Archivo Narrow (Informações Básicas / Nomes)**
   *Uso*: Nomes dos jogadores, menus secundários de transmissão e descrições rápidas de canais. Oferece alta densidade de informação sem comprometer a leitura em aparelhos móveis compactos.
3. **JetBrains Mono (Dados Tecnológicos / Cronômetros)**
   *Uso*: Contagem regressiva da transmissão, estatísticas esportivas cruciais e relógios do estúdio. Transmite precisão cirúrgica de analistas táticos.

---

## 🗞️ 4. Athletic Editorial — Player Overlay Card

The player overlay card (`PlayerOverlayCard`) follows an **Athletic Editorial** aesthetic that rejects the soft-card conventions of SaaS dashboards in favour of direct high-impact typography, hard dark-and-light contrast, and accent highlights matched dynamically to each athlete's national team colour.

### Principles

| Principle | Expression in the card |
|-----------|----------------------|
| **High-impact typography** | Player name at `text-4xl font-anton uppercase`, jersey number as a full-bleed watermark behind the header at 7% opacity |
| **Dark-and-light contrast** | Crisp `rounded-xl border` shell with no soft background gradients; `bg-[#0c0d0e]` in dark mode, clean `bg-white` in light |
| **Dynamic team accent** | Every accent element (top bar, stat left-borders, number badge, watermark) uses the team's `primaryColor` at runtime — a Brazil player is green/yellow, a France player is deep blue |
| **Editorial stat blocks** | Stats rendered as `border-l-[3px]` left-border tiles with `font-anton text-2xl` values; no rounded pill backgrounds |
| **Semantic tournament stats** | Goals (green), yellow cards (amber), red cards (rose) keep their semantic text colour; the structural left-border remains in `primaryColor` |

### Implementation contract

- The `accent` variable (`primaryColor ?? "#00e476"`) drives: top accent bar, stat `borderLeftColor`, number badge `background`, captain badge `color`/`borderColor`, photo area `background` tint (`${accent}12`).
- `stat.accent` (a Tailwind text-color class) overrides only the **value text** for tournament stats; it does not override the left-border colour.
- `rounded-xl` for the card shell; `rounded-lg` for the photo container; `rounded-sm` for small inline badges — no `rounded-3xl` or `rounded-full` within the card.
- Detail rows use hairline `border-b` separators (not background tiles) for a editorial table look.

---

## 🏟️ 5. Arquitetura de Componentes & Central Tática

O aplicativo está estruturado com alta modularidade em três camadas funcionais no mesmo contêiner visual responsivo:

### 📺 A. Guia de Transmissões ("Onde Assistir")
- Recria com fidelidade de pixel a tela solicitada de horários de transmissão da Copa do Mundo 2026.
- Linhas com link direto para canais oficiais (Globo, CazéTV, SportTV e FIFA+).
- Quadro inferior com citação em itálico de incentivo à experiência em 4K.
- Contador regressivo dinâmico que atualiza a cada segundo, permitindo simulações de relógio em tempo real, destacando o evento atual e o próximo evento.

### 🛡️ B. Distribuição Espacial e Escalação Tática (`PitchLineup`)
- Campo de futebol visualizado em vetor responsivo com linhas de demarcação oficiais projetadas por CSS.
- Distribuição espacial dinâmica para o time escalado (Brasil ou França no clássico do MetLife Stadium).
- Gaveta lateral detalhada para exibição dos clubes originais, valor de mercado simulado e notas táticas dos atletas selecionados.

## 📱 6. Design Responsivo & Transições

- **Desktop**: Grade de 12 colunas com layout fluido agrupado em bento-boxes dinâmicos.
- **Mobile**: Compressão ágil para 4 colunas; o campo de futebol converte-se em layout de rolagem suave com botões ajustáveis de toque suave minimizando erros de digitação (Targets de no mínimo 44px).
- **Micro-interações**: Efeitos de brilho e pulsação em cards ativos e botões hover para dar "vida" broadcast à arena.
