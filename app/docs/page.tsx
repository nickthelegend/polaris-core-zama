"use client"

import {
  FolderOpen,
  Wallet,
  CreditCard,
  Gavel,
  Terminal,
  Search,
  Code,
  HelpCircle,
  ChevronRight
} from "lucide-react"

export default function DocsPage() {
  return (
    <div className="flex -mx-4 md:-mx-8 lg:-mx-12 h-[calc(100vh-140px)] overflow-hidden border-t border-white/5 font-display">
      {/* Left Column: Navigation Tree */}
      <aside className="w-72 glass-sidebar flex flex-col custom-scrollbar overflow-y-auto hidden lg:flex bg-background/50">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-white text-sm font-bold tracking-widest font-mono mb-1">OBOLUS_DOCS</h1>
            <p className="text-primary/60 text-[10px] font-mono uppercase tracking-[0.2em]">v3.0.0-MULTI_CHAIN_ALPHA</p>
          </div>
          <nav className="space-y-1">
            <a className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all" href="#architecture">
              <FolderOpen className="text-white/40 group-hover:text-primary size-4" />
              <p className="text-white/60 group-hover:text-white text-[11px] font-mono tracking-tighter">01_CORE_ARCHITECTURE</p>
            </a>
            <a className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all" href="#liquidity-sync">
              <Wallet className="text-white/40 group-hover:text-primary size-4" />
              <p className="text-white/60 group-hover:text-white text-[11px] font-mono tracking-tighter">02_LIQUIDITY_SYNC</p>
            </a>
            <a className="group flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(167,242,74,0.1)]" href="#bnpl-facility">
              <CreditCard className="text-primary size-4" />
              <p className="text-primary text-[11px] font-mono tracking-tighter neon-glow">03_CREDIT_FACILITY</p>
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            </a>
            <div className="pl-8 flex flex-col gap-1 mt-1 border-l border-white/5 ml-5">
              <a className="text-white/40 hover:text-primary text-[10px] font-mono py-1 transition-colors uppercase" href="#score-manager">SCORE_SYSTEM</a>
              <a className="text-white/40 hover:text-primary text-[10px] font-mono py-1 transition-colors uppercase" href="#loan-engine">LOAN_ENGINE</a>
              <a className="text-white/40 hover:text-primary text-[10px] font-mono py-1 transition-colors uppercase" href="#repayment">REPAYMENT_FLOW</a>
            </div>
            <a className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all" href="#cross-chain">
              <Gavel className="text-white/40 group-hover:text-primary size-4" />
              <p className="text-white/60 group-hover:text-white text-[11px] font-mono tracking-tighter">04_CROSS_CHAIN_POOLS</p>
            </a>
            <a className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all" href="#api-ref">
              <Terminal className="text-white/40 group-hover:text-primary size-4" />
              <p className="text-white/60 group-hover:text-white text-[11px] font-mono tracking-tighter">05_INTEGRATION_API</p>
            </a>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-white/5">
          <button className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary px-4 py-2.5 rounded-lg text-xs font-mono hover:bg-primary/10 transition-all uppercase tracking-tighter">
            <Code className="size-3" />
            CONTRACTS_GITHUB
          </button>
        </div>
      </aside>

      {/* Center Column: Main Content */}
      <main className="flex-1 custom-scrollbar overflow-y-auto bg-background/20">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-8 font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">
            <a className="hover:text-primary transition-colors" href="#">ROOT</a>
            <ChevronRight className="size-2 text-white/20" />
            <a className="hover:text-primary transition-colors" href="#">03_BNPL_REPAYMENTS</a>
            <ChevronRight className="size-2 text-white/20" />
            <span className="text-primary/70">BNPL_MECHANICS</span>
          </div>

          {/* Page Heading */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-6 text-white uppercase italic">
              OBOLUS_PROTOCOL <span className="text-primary">//</span> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">MASTER_SPECIFICATION</span>
            </h1>
            <p className="text-white/50 text-base font-mono leading-relaxed max-w-2xl uppercase tracking-tight">
              The first cross-chain BNPL network on Creditcoin. Obolus utilizes a Hub-and-Spoke architecture to aggregate liquidity from multiple chains and provide instant credit lines.
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-16 pb-24">
            <section id="architecture">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-primary font-mono text-sm">[1.0]</span>
                <h3 className="text-2xl font-bold tracking-tight uppercase italic">HUB_AND_SPOKE_MODEL</h3>
              </div>
              <p className="text-white/60 font-mono text-xs leading-relaxed mb-6 uppercase tracking-wide">
                Obolus separates state into two layers: The **Master Hub** (USC Hub V2) handles credit logic, scoring, and global balances. **Spoke Chains** (Sepolia, Hedera, Base) house the Liquidity Vaults where users deposit assets.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 border border-white/10 rounded-xl mb-8">
                <div className="space-y-2">
                  <h4 className="text-primary text-[10px] font-bold uppercase tracking-widest">MASTER_HUB (CREDITCOIN_USC)</h4>
                  <ul className="text-[10px] text-white/50 font-mono space-y-1 uppercase">
                    <li>• PoolManager.sol (Global State)</li>
                    <li>• LoanEngine.sol (Credit Logic)</li>
                    <li>• ScoreManager.sol (Credit Score)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">SPOKE_CHAINS (EVM_EXTENSIONS)</h4>
                  <ul className="text-[10px] text-white/50 font-mono space-y-1 uppercase">
                    <li>• LiquidityVault.sol (Assets)</li>
                    <li>• MockERC20.sol (Tokens)</li>
                    <li>• Prover_API (Cross-chain Verification)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="liquidity-sync">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-primary font-mono text-sm">[2.0]</span>
                <h3 className="text-2xl font-bold tracking-tight uppercase italic">LIQUIDITY_SYNCHRONIZATION</h3>
              </div>
              <p className="text-white/60 font-mono text-xs leading-relaxed mb-6 uppercase tracking-wide">
                Liquidity is synced via **Native Verification Proofs**. When a user deposits on a Spoke, the Proof-Gen API generates a Merkle Proof which is then submitted to the Hub's `PoolManager`.
              </p>

              {/* Terminal Code Block */}
              <div className="terminal-block rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">typescript — use-obolus.ts</span>
                </div>
                <div className="p-5 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  <div className="flex gap-4">
                    <span className="text-white/20 select-none">1</span>
                    <span className="text-[#ff79c6]">const</span> <span className="text-white">receipt = </span> <span className="text-[#ff79c6]">await</span> <span className="text-white">poolManager.addLiquidityFromProof(</span>
                  </div>
                  <div className="flex gap-4 mt-1 pl-4">
                    <span className="text-white/20 select-none">2</span>
                    <span className="text-white">proof.chainKey,</span>
                  </div>
                  <div className="flex gap-4 mt-1 pl-4">
                    <span className="text-white/20 select-none">3</span>
                    <span className="text-white">proof.blockHeight,</span>
                  </div>
                  <div className="flex gap-4 mt-1 pl-4">
                    <span className="text-white/20 select-none">4</span>
                    <span className="text-white">proof.encodedTransaction,</span>
                  </div>
                  <div className="flex gap-4 mt-1 pl-4">
                    <span className="text-white/20 select-none">5</span>
                    <span className="text-white">proof.merkleRoot,</span>
                  </div>
                  <div className="flex gap-4 mt-1 pl-4">
                    <span className="text-white/20 select-none">6</span>
                    <span className="text-white">proof.siblings</span>
                  </div>
                  <div className="flex gap-4 mt-1">
                    <span className="text-white/20 select-none">7</span>
                    <span className="text-white">);</span>
                  </div>
                </div>
              </div>
            </section>

            <section id="bnpl-facility">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-primary font-mono text-sm">[3.0]</span>
                <h3 className="text-2xl font-bold tracking-tight uppercase italic">CREDIT_SCORE_SYSTEM</h3>
              </div>
              <p className="text-white/60 font-mono text-xs leading-relaxed mb-4 uppercase tracking-wide">
                The **ScoreManager** tracks user behavior. Your credit limit is a dynamic function of your **Aggregated Collateral** and your **Obolus FICO Score** (300 to 850).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/20 transition-all group">
                  <h4 className="text-primary font-mono text-[9px] mb-2 font-bold tracking-[0.2em]">FORMULA_01: CREDIT_LIMIT</h4>
                  <p className="text-white text-xs font-bold font-mono group-hover:text-primary transition-colors uppercase">Limit = Total_Collateral * (Score / 1000)</p>
                  <p className="text-white/40 text-[10px] mt-1 font-mono uppercase">LTV scales from 30% (Bad Score) to 85% (Perfect Score).</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-blue-400/20 transition-all group">
                  <h4 className="text-blue-400 font-mono text-[9px] mb-2 font-bold tracking-[0.2em]">SCORE_BOOSTS</h4>
                  <p className="text-white text-xs font-bold font-mono group-hover:text-blue-400 transition-colors uppercase">On-time Repayment = +5 Points</p>
                  <p className="text-white/40 text-[10px] mt-1 font-mono uppercase">Partial repayments also contribute to score normalization.</p>
                </div>
              </div>
            </section>

            <section id="cross-chain">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-primary font-mono text-sm">[4.0]</span>
                <h3 className="text-2xl font-bold tracking-tight uppercase italic">CROSS_CHAIN_POOLS</h3>
              </div>
              <p className="text-white/60 font-mono text-xs leading-relaxed mb-6 uppercase tracking-wide">
                Obolus supports multi-chain asset aggregation. Whitelisted tokens are mapped to global pools on the Hub, allowing a Sepolia-deposited USDC to back a credit line used for a payment on another chain.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-white/2 hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-[10px]">ETH</div>
                    <div>
                      <p className="text-[10px] text-white font-bold font-mono">SEPOLIA_USDC</p>
                      <p className="text-[8px] text-white/30 font-mono">0xbCFC...C44A</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-primary font-mono">ACTIVE</p>
                    <p className="text-[8px] text-white/30 font-mono">CHAIN_ID: 11155111</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-white/2 hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-[10px]">HBAR</div>
                    <div>
                      <p className="text-[10px] text-white font-bold font-mono">HEDERA_USDT</p>
                      <p className="text-[8px] text-white/30 font-mono">0x2A2...B5F</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-primary font-mono">ACTIVE</p>
                    <p className="text-[8px] text-white/30 font-mono">CHAIN_ID: 296</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="api-ref" className="pt-8">
              <div className="flex items-center gap-4 mb-4 border-t border-white/5 pt-12">
                <span className="text-primary font-mono text-sm">[5.0]</span>
                <h3 className="text-2xl font-bold tracking-tight uppercase italic">INTEGRATION_API</h3>
              </div>
              <p className="text-white/60 font-mono text-xs leading-relaxed mb-4 uppercase tracking-wide">
                Third-party merchants can integrate Obolus BNPL via the **MerchantRouter**. This allows instant settlements for users while the protocol handles the deferred payment logic.
              </p>
              <div className="p-4 rounded-lg bg-[#282a36] font-mono text-[10px] border border-white/5 overflow-x-auto">
                <p className="text-[#6272a4]">// cURL Example: Initialize BNPL Checkout</p>
                <p className="text-white mt-2">
                  <span className="text-[#ff79c6]">curl</span> -X POST https://api.obolus.finance/v1/checkout \
                </p>
                <p className="text-white pl-4">
                  -H <span className="text-[#f1fa8c]">"Authorization: Bearer $API_KEY"</span> \
                </p>
                <p className="text-white pl-4">
                  -d <span className="text-[#f1fa8c]">'{`{ "amount": 150.00, "currency": "USD", "merchant_id": "M_8231" }`}'</span>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Right Column: Quick Links */}
      <aside className="w-64 glass-sidebar p-6 hidden xl:flex flex-col overflow-y-auto">
        <div className="sticky top-0 h-full flex flex-col">
          <h5 className="text-white/40 text-[9px] font-mono tracking-[0.3em] uppercase mb-6">IN_THIS_SECTION</h5>
          <ul className="space-y-4 flex-1">
            <li>
              <a className="group block" href="#architecture">
                <p className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors mb-1 font-bold uppercase">ARCH_OVERVIEW</p>
                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/4 bg-primary/40 group-hover:w-full transition-all duration-500"></div>
                </div>
              </a>
            </li>
            <li>
              <a className="group block" href="#liquidity-sync">
                <p className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors mb-1 font-bold uppercase">LIQUIDITY_SYNC</p>
                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-primary/40 group-hover:w-full transition-all duration-500"></div>
                </div>
              </a>
            </li>
            <li>
              <a className="group block" href="#bnpl-facility">
                <p className="text-[10px] font-mono text-white/60 group-hover:text-primary transition-colors mb-1 font-bold uppercase">CREDIT_FACILITY</p>
                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-primary/40 group-hover:w-full transition-all duration-500"></div>
                </div>
              </a>
            </li>
          </ul>

          <div className="mt-8 p-4 rounded-xl terminal-block relative group cursor-pointer overflow-hidden mb-6">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <HelpCircle className="text-primary size-4 mb-2" />
              <h6 className="text-white font-mono text-[10px] mb-1 font-bold uppercase tracking-wider">NEED_ASSISTANCE?</h6>
              <p className="text-white/40 text-[9px] font-mono uppercase tracking-tight">Access our dev community on Discord for real-time support.</p>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#a7f24a] animate-pulse"></span>
              <span className="text-[9px] font-mono text-primary font-bold tracking-widest uppercase">SYSTEM_OPERATIONAL</span>
            </div>
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">BLOCK_HEIGHT: 18,245,091</p>
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">LATENCY: 12ms</p>
          </div>
        </div>
      </aside>
    </div>
  )
}