import React, { useState, useEffect, useRef } from "react";
import { Match, PredictionResult, ChatMessage } from "../types";

interface AIPunditPanelProps {
  match: Match;
}

export const AIPunditPanel: React.FC<AIPunditPanelProps> = ({ match }) => {
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "model",
      text: `Olá! Sou o **Tático Agora na Copa 26** 🎙️⚽. Estou pronto para debater as escalações de ${match.teamA.name} e ${match.teamB.name}. Pergunte-me sobre encaixes táticos, ajustes de sistema ou como parar os jogadores decisivos do confronto.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll down in chat messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Request high-octane AI prediction
  const fetchPrediction = async () => {
    setLoadingPrediction(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamA: match.teamA.name, teamB: match.teamB.name })
      });
      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      } else {
        throw new Error("Erro na solicitação");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingPrediction(false);
    }
  };

  // Submit message to chatbot
  const submitMessage = async (msgText: string) => {
    if (!msgText.trim() || loadingChat) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoadingChat(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText, history })
      });

      if (res.ok) {
        const data = await res.json();
        const serverMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "model",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages((prev) => [...prev, serverMsg]);
      } else {
        throw new Error("Falha de comunicação");
      }
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "model",
        text: "Houve um soluço tático na minha conexão com a nuvem, mas ainda prevejo um jogo tenso! Destaque para contra-ataques táticos rápidos.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Trigger quick suggestions
  const suggestedQuestions = [
    `Como neutralizar o ataque de ${match.teamB.name}?`,
    `Onde estão os principais duelos individuais deste jogo?`,
    `Análise da formação tática sugerida.`
  ];

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6" id="ai-pundit-grid">

      {/* COLUMN 1: AI Prediction Hub */}
      <div className="flex flex-col space-y-4" id="ai-prediction-column">
        <div className="p-5 rounded-xl glassmorphic-card border border-white/10 flex flex-col justify-between" id="ai-prediction-card">
          <div>
            <div className="flex items-center space-x-2.5 mb-4" id="prediction-header">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffd700] animate-pulse"></div>
              <h3 className="font-anton text-lg tracking-wider text-white uppercase flex items-center">
                PREVISÃO TÁTICA DA COPA COM GEMINI AI
              </h3>
            </div>

            <p className="text-sm font-archivo text-white/85 mb-5 leading-6">
              O modelo inteligente analisa escalações, encaixes de jogo e comportamentos esperados das duas seleções para entregar previsões em tempo real.
            </p>

            {prediction && (
              <div className="space-y-4 mb-6 border-t border-white/10 pt-4 text-white" id="prediction-results">
                {/* Formations layout */}
                <div className="grid grid-cols-2 gap-3" id="formation-comparison">
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-center">
                    <span className="block text-xs font-mono text-white/60">SISTEMA {match.teamA.name}</span>
                    <span className="font-anton text-lg text-[#00e476]">{prediction.suggestedFormationA}</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-center">
                    <span className="block text-xs font-mono text-white/60">SISTEMA {match.teamB.name}</span>
                    <span className="font-anton text-lg text-[#ffd700]">{prediction.suggestedFormationB}</span>
                  </div>
                </div>

                {/* Tactical preview paragraph */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm font-archivo leading-relaxed text-white/90">
                  <span className="block text-xs font-mono text-[#ffd700] uppercase mb-1">Análise do Espetáculo</span>
                  <p>{prediction.prediction}</p>
                </div>

                {/* Key decided battle */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm font-archivo text-white/90">
                  <span className="block text-xs font-mono text-[#00ff85] uppercase mb-1">A Batalha Chave</span>
                  <p className="italic">"{prediction.tacticalNotes}"</p>
                </div>

                {/* Star players */}
                <div id="star-players-visualizer">
                  <span className="block text-xs font-mono text-white/60 uppercase mb-2">Jogadores Termômetro do Jogo:</span>
                  <div className="flex flex-wrap gap-2">
                    {prediction.keyPlayers.map((player, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#121414] border border-white/10 rounded-full font-archivo text-xs text-[#00e476]">
                        ⭐️ {player}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            id="btn-generate-ai-prediction"
            onClick={fetchPrediction}
            disabled={loadingPrediction}
            className={`w-full py-3 rounded-lg font-anton tracking-wider text-black text-sm uppercase transition-all duration-300 ${
              loadingPrediction
                ? "bg-white/10 text-white border border-white/15 cursor-not-allowed"
                : "bg-[#ffd700] hover:bg-[#ffe05c] active:scale-[0.98] shadow-[0_0_15px_rgba(255,215,0,0.2)]"
            }`}
          >
            {loadingPrediction ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Calculando Sistemas Táticos...</span>
              </div>
            ) : prediction ? (
              "Recalcular Previsão com IA"
            ) : (
              "Gerar Análise Tática por Inteligência Artificial"
            )}
          </button>
        </div>

        <div className="p-5 rounded-xl glassmorphic-card border border-white/10 text-white" id="match-transmission-card">
          <h4 className="font-anton text-sm uppercase tracking-widest text-white/85 mb-3 block">FICHA DE TRANSMISSÃO</h4>
          <div className="space-y-2.5" id="transmission-rows-wrapper">
            <div className="flex justify-between items-center text-xs p-2 bg-white/5 rounded border border-white/5">
              <span className="text-white/75 font-mono">DATA</span>
              <span className="font-archivo text-white">{match.kickoffDate}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-white/5 rounded border border-white/5">
              <span className="text-white/75 font-mono">HORA (BRT)</span>
              <span className="font-archivo text-white">{match.kickoffTime}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-white/5 rounded border border-white/5">
              <span className="text-white/75 font-mono">ESTÁDIO</span>
              <span className="font-archivo text-white text-right">{match.stadiumName}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-white/5 rounded border border-white/5">
              <span className="text-white/75 font-mono">CIDADE</span>
              <span className="font-archivo text-white">{match.city}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-white/5 rounded border border-white/5">
              <span className="text-white/75 font-mono">FASE</span>
              <span className="font-archivo text-white">{match.stageName}</span>
            </div>
            <div className="p-3 bg-white/5 rounded border border-white/5">
              <span className="block text-xs font-mono text-white/75 mb-2">CANAIS DISPONÍVEIS</span>
              <div className="flex flex-wrap gap-2">
                {match.broadcasters.map((cast) => (
                  <span key={cast.id} className="px-2.5 py-1 rounded-full bg-[#121414] border border-white/10 text-xs font-archivo text-white/90">
                    {cast.name} · {cast.type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Soccer Tactical Chatroom */}
      <div className="p-5 rounded-xl glassmorphic-card border border-white/10 flex flex-col justify-between h-[520px] text-white" id="interactive-chat-column">
        {/* Header information */}
        <div className="border-b border-white/10 pb-3 flex items-center space-x-3" id="chat-header">
          <div className="w-9 h-9 rounded-full bg-[#00e476]/15 text-[#00e476] flex items-center justify-center font-bold">
            🎙️
          </div>
          <div>
            <h4 className="font-anton text-sm uppercase tracking-wider text-white">CHAT TÁTICO AGORA NA COPA 26</h4>
            <p className="text-xs font-mono text-white/70 leading-5">* Assistente de IA especializado em esquemas da Copa</p>
          </div>
        </div>

        {/* Messaging Box */}
        <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1 scroll-smooth" id="chat-messages-container">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div className={`p-3 rounded-xl text-sm font-archivo ${
                msg.role === "user"
                  ? "bg-[#004d2c] border border-white/10 text-[#7bbd93]"
                  : "bg-[#1E2020] border border-white/5 text-white"
              }`}>
                {/* Convert standard Markdown stars manually for light styling */}
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.text.split("**").map((chunk, i) => i % 2 === 1 ? <strong key={i} className="text-[#ffd700] font-semibold">{chunk}</strong> : chunk)}
                </p>
              </div>
              <span className="text-xs font-mono text-white/55 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}
          {loadingChat && (
            <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-xl mr-auto max-w-[80%]" id="chat-typing-indicator">
              <span className="text-sm font-archivo text-white/70">Tático Agora na Copa 26 está digitando...</span>
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-[#00e476] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#ffd700] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#00e476] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Quick Template Questions */}
        <div className="mb-3" id="quick-questions-wrapper">
          <span className="block text-xs font-mono text-white/70 mb-1.5 uppercase">💡 SUGESTÕES DE ANÁLISE:</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                id={`btn-suggested-${idx}`}
                onClick={() => submitMessage(q)}
                disabled={loadingChat}
                className="text-xs font-archivo text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-md transition text-left leading-5"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          id="chat-submit-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitMessage(inputMessage);
          }}
          className="flex space-x-2"
        >
          <input
            id="chat-input-text"
            type="text"
            placeholder="Perguntar sobre formação, encaixes e jogadores-chave..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loadingChat}
            className="flex-1 bg-[#121414] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-archivo text-white placeholder-white/60 focus:outline-none focus:border-[#00e476]"
          />
          <button
            id="btn-chat-send"
            type="submit"
            disabled={loadingChat || !inputMessage.trim()}
            className={`px-4 py-2.5 rounded-lg font-anton tracking-wider text-sm uppercase transition ${
              !inputMessage.trim() || loadingChat
                ? "bg-white/5 border border-white/5 text-white/30 cursor-not-allowed"
                : "bg-[#00e476] text-black hover:bg-[#2eff97] active:scale-95"
            }`}
          >
            Sondar
          </button>
        </form>

      </div>

    </div>
  );
};
