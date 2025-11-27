import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

interface AuthorProfileProps {
  onBack: () => void;
}

export function AuthorProfile({ onBack }: AuthorProfileProps) {
  // ESC to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div className="min-h-screen bg-black text-[#39ff14] font-mono text-sm md:text-base relative selection:bg-[#39ff14] selection:text-black pb-16">
      {/* CRT overlay */}
      <div className="pointer-events-none fixed inset-0 z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] bg-repeat mix-blend-screen" />
      <div className="pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle,rgba(0,0,0,0)_60%,rgba(0,0,0,0.7)_100%)]" />

      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-black/80 backdrop-blur-sm border-b border-[#39ff14]/20">
        <div className="text-xs md:text-sm text-gray-400">
          yao@nonono:~/about <span className="text-[#39ff14]">$</span> cat <span className="text-white">CREATOR.txt</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400 hover:text-[#39ff14] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>[ ESC / CLICK TO BACK ]</span>
        </button>
      </header>

      <main className="relative z-50 max-w-4xl mx-auto px-4 md:px-8 pt-8 space-y-12">
        {/* CREATOR */}
        <section>
          <SectionTitle label="<CREATOR />" />
          <div className="space-y-2 text-xs md:text-sm">
            <p>{'> NAME:   Yao Shifu (要师傅)'}</p>
            <p>{'> ROLE:   Independent Agent Engineer / Creator'}</p>
            <p>{'> EXP:    17 years of code'}</p>
          </div>
          <div className="mt-6 space-y-3 text-[#c5f7c5]">
            <p>
              将 AI 能力转化为可靠、可落地的产品功能。拒绝 PPT 架构，拒绝纸上谈兵，专注把实验性的 Demo 变成可维护、可扩展的线上系统。
            </p>
            <p>
              I bridge the gap between AI demos and scalable systems. From microservices to AI agents, every line of code is written to solve real problems.
            </p>
            <p className="text-[#39ff14]">
              "Make it Work. Make it Right. Make it Fast."
            </p>
          </div>
        </section>

        {/* WHAT I DO */}
        <section>
          <SectionTitle label="WHAT I DO" />
          <div className="grid md:grid-cols-2 gap-8 mt-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">[ 01. AI ENGINEERING ]</p>
              <ul className="space-y-1">
                <li>{'> LLM Integration & Orchestration'}</li>
                <li>{'> RAG / 检索增强 与上下文管理'}</li>
                <li>{'> Agentic workflows & 工具调用'}</li>
                <li>{'> 结构化输出 & 评估/可观测性'}</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">[ 02. SYSTEM ARCHITECTURE ]</p>
              <ul className="space-y-1">
                <li>{'> 高并发后端 · Microservices'}</li>
                <li>{'> Event Sourcing / CQRS'}</li>
                <li>{'> Cloud Native · Kubernetes / Docker'}</li>
                <li>{'> 从 0 到 1 的产品架构与迭代'}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* TECH */}
        <section>
          <SectionTitle label="TECH" />
          <pre className="mt-4 text-xs md:text-sm text-[#9ee89e] whitespace-pre overflow-x-auto border border-[#39ff14]/30 p-4 bg-black/60">
{`. 
├── Languages
│   ├── TypeScript / Node.js
│   ├── Python
│   ├── Scala / Java
│   └── Go
├── Frontend
│   ├── React / Next.js
│   ├── Flutter
│   └── TailwindCSS
└── Infrastructure
    ├── Kubernetes / Docker
    ├── AWS / AliCloud
    └── PostgreSQL`}
          </pre>
        </section>

        {/* CONNECT */}
        <section>
          <SectionTitle label="CONNECT" />
          <div className="mt-4 space-y-2 text-xs md:text-sm text-gray-400">
            <p>{'# Open for remote work, consulting, or small focused teams.'}</p>
            <a
              href="mailto:yaoqiangshmily@gmail.com"
              className="block mt-4 text-xl md:text-2xl text-[#39ff14] hover:text-[#ff10f0] break-all"
            >
              yaoqiangshmily@gmail.com
            </a>
          </div>
        </section>

        <footer className="mt-10 pt-4 border-t border-[#39ff14]/20 text-[10px] text-gray-600 flex justify-between">
          <span>YAOSHIFU // NO BORING CODE</span>
          <span>v2024.11</span>
        </footer>
      </main>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="mb-3">
      <div className="text-[#ff10f0] text-sm md:text-base font-bold tracking-wide">
        {`> ${label}`}
      </div>
      <div className="h-px w-full bg-[#39ff14]/30 mt-1" />
    </div>
  );
}
