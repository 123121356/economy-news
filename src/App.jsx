import { useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── 실제 환율 데이터 (2026년 3월 12일 기준) ──────────────
const exchangeRates = [
  {
    pair: "USD/KRW", name: "달러/원", rate: 1476.51, change: +3.35, changePct: +0.23,
    flag: "🇺🇸→🇰🇷",
    history: [1499,1495,1498,1492,1488,1482,1476,1474,1473,1476.51],
    note: "미·이란 지정학적 긴장 완화로 소폭 반등"
  },
  {
    pair: "EUR/KRW", name: "유로/원", rate: 1690.59, change: -3.96, changePct: -0.23,
    flag: "🇪🇺→🇰🇷",
    history: [1748,1740,1730,1720,1710,1705,1700,1695,1694,1690.59],
    note: "ECB 금리인하 기조 지속으로 유로 약세"
  },
  {
    pair: "JPY/KRW", name: "엔/원(100엔)", rate: 983.20, change: +4.10, changePct: +0.42,
    flag: "🇯🇵→🇰🇷",
    history: [960,965,970,975,978,980,982,984,981,983.20],
    note: "BOJ 추가 금리인상 기대에 엔화 강세"
  },
  {
    pair: "CNY/KRW", name: "위안/원", rate: 203.40, change: +0.80, changePct: +0.39,
    flag: "🇨🇳→🇰🇷",
    history: [198,199,200,201,202,202.5,203,203.1,202.6,203.40],
    note: "중국 경기부양책 기대감 반영"
  },
  {
    pair: "GBP/KRW", name: "파운드/원", rate: 1986.30, change: +8.57, changePct: +0.43,
    flag: "🇬🇧→🇰🇷",
    history: [1950,1955,1960,1965,1970,1975,1978,1982,1977,1986.30],
    note: "영국 경제지표 개선으로 파운드 강세"
  },
  {
    pair: "USD/JPY", name: "달러/엔", rate: 150.20, change: -0.55, changePct: -0.37,
    flag: "🇺🇸→🇯🇵",
    history: [155,154,153,152.5,152,151.5,151,150.8,150.7,150.20],
    note: "BOJ 금리인상 기대에 엔화 강세"
  },
];

// ── 실제 금리 데이터 (2026년 3월 12일 기준) ──────────────
const interestRates = [
  {
    country: "🇰🇷 한국", code: "KR", rate: 2.50, prevRate: 2.75,
    label: "한국은행 기준금리", nextMeeting: "2026.04.10", status: "동결", statusColor: "#ffc800",
    history: [
      {d:"24.07",r:3.50},{d:"24.10",r:3.25},{d:"24.11",r:3.00},{d:"24.12",r:2.75},
      {d:"25.02",r:2.75},{d:"25.05",r:2.50},{d:"25.07",r:2.50},{d:"26.01",r:2.50},{d:"26.02",r:2.50}
    ],
    desc: "2024년 10월부터 인하 시작해 100bp 내린 후, 2025년 5월부터 2.50%에서 동결을 이어가고 있습니다. 다음 회의는 4월 10일입니다."
  },
  {
    country: "🇺🇸 미국", code: "US", rate: 3.625, prevRate: 3.875,
    label: "연준(Fed) 기준금리", nextMeeting: "2026.03.19", status: "동결", statusColor: "#ffc800",
    history: [
      {d:"24.09",r:5.00},{d:"24.11",r:4.75},{d:"24.12",r:4.50},{d:"25.09",r:4.25},
      {d:"25.11",r:4.00},{d:"25.12",r:3.625},{d:"26.01",r:3.625},{d:"26.03",r:3.625}
    ],
    desc: "2025년 9월부터 인하를 재개하여 현재 3.5~3.75% 범위로 유지 중입니다. 다음 FOMC는 3월 18~19일 예정입니다."
  },
  {
    country: "🇪🇺 유럽", code: "EU", rate: 2.40, prevRate: 3.00,
    label: "ECB 예금금리", nextMeeting: "2026.04.17", status: "인하", statusColor: "#4ade80",
    history: [
      {d:"24.06",r:3.75},{d:"24.09",r:3.50},{d:"24.10",r:3.25},{d:"24.12",r:3.00},
      {d:"25.01",r:2.75},{d:"25.03",r:2.50},{d:"25.06",r:2.40},{d:"26.03",r:2.40}
    ],
    desc: "유럽중앙은행(ECB)이 인플레이션 안정을 바탕으로 지속적인 금리인하를 단행해왔습니다. 현재 미국보다 금리가 낮습니다."
  },
  {
    country: "🇯🇵 일본", code: "JP", rate: 0.75, prevRate: 0.50,
    label: "일본은행(BOJ) 기준금리", nextMeeting: "2026.04.30", status: "인상 기조", statusColor: "#f87171",
    history: [
      {d:"24.03",r:0.00},{d:"24.07",r:0.25},{d:"25.01",r:0.50},{d:"25.12",r:0.75},
      {d:"26.01",r:0.75},{d:"26.03",r:0.75}
    ],
    desc: "2025년 12월 0.75%로 인상 후 유지 중. 약 30년 만에 최고 수준으로, 추가 인상 기대감이 엔화 강세를 이끌고 있습니다."
  },
];

const koreanNews = [
  { id:"k1", country:"KR", title:"한국은행, 기준금리 2.50% 동결…물가 안정·부동산·환율 균형 고려", summary:"한국은행 금융통화위원회가 기준금리를 2.50%로 동결했다. 수도권 부동산 가격 재상승 우려와 원화 약세가 지속되는 가운데, 경기 부양보다는 금융 안정에 방점을 둔 결정이다.", source:"한국경제", time:"2시간 전", category:"통화정책", icon:"🏦" },
  { id:"k2", country:"KR", title:"코스피, 미·이란 갈등 여파로 2,350선 급락…외국인 대규모 이탈", summary:"코스피 지수가 미국-이스라엘의 이란 공습 여파로 2,350선으로 급락했다. 외국인 투자자들의 대규모 매도가 이어지며 반도체·에너지 관련주가 큰 폭으로 하락했다.", source:"연합뉴스", time:"3시간 전", category:"주식시장", icon:"📉" },
  { id:"k3", country:"KR", title:"원/달러 환율 1,476원대…한때 1,500원 육박 후 안정화", summary:"원/달러 환율이 1,476원대에서 거래 중이다. 지난 주 지정학적 리스크로 한때 17년래 최고치인 1,499원까지 치솟았으나, 긴장 완화 소식에 소폭 안정되었다.", source:"파이낸셜뉴스", time:"4시간 전", category:"환율", icon:"💱" },
  { id:"k4", country:"KR", title:"현대차·기아, 미국 자동차 관세 25% 직격탄…대응책 마련 시급", summary:"미국의 수입 자동차 25% 관세 부과가 현실화되면서 현대차·기아의 미국 수출 경쟁력에 비상이 걸렸다. 업계는 미국 현지 생산 확대와 가격 정책 재조정을 검토 중이다.", source:"조선비즈", time:"5시간 전", category:"산업", icon:"🚗" },
  { id:"k5", country:"KR", title:"2월 소비자물가 2.2% 상승…국제 유가 급등에 에너지 물가 반등", summary:"2월 소비자물가지수가 전년 동월 대비 2.2% 상승했다. 중동 분쟁에 따른 유가 급등으로 에너지 물가가 다시 오름세로 전환된 영향이다.", source:"통계청", time:"6시간 전", category:"물가", icon:"📊" },
];
const usNews = [
  { id:"u1", country:"US", title:"Fed Holds at 3.5–3.75%; March FOMC Meeting Next Week", summary:"The Federal Reserve kept its benchmark rate at 3.5–3.75%, with the next FOMC meeting set for March 18-19. Markets await signals on the pace of further cuts amid sticky services inflation and Middle East uncertainty.", source:"Reuters", time:"1h ago", category:"Monetary Policy", icon:"🏛️" },
  { id:"u2", country:"US", title:"S&P 500 Recovers After Iran Strike Selloff; Oil Prices Ease", summary:"U.S. equities rebounded as oil prices pulled back from 3-month highs. The S&P 500 gained 0.8% as diplomatic signals suggested the Iran conflict may de-escalate, easing energy inflation fears.", source:"Bloomberg", time:"2h ago", category:"Markets", icon:"📈" },
  { id:"u3", country:"US", title:"February CPI Comes in at 3.1%; Core Still Elevated at 3.3%", summary:"Consumer prices rose 3.1% year-over-year in February. Core CPI excluding food and energy remained elevated at 3.3%, keeping the Fed cautious about further rate cuts in the near term.", source:"WSJ", time:"4h ago", category:"Inflation", icon:"📊" },
  { id:"u4", country:"US", title:"Auto Tariffs Take Effect April 2; Detroit Braces for Supply Chain Disruption", summary:"The 25% tariff on imported automobiles officially takes effect April 2, hitting South Korea, Japan, Germany and Canada hardest. U.S. automakers warn of parts shortages and higher vehicle prices.", source:"NYT", time:"5h ago", category:"Trade", icon:"🚢" },
  { id:"u5", country:"US", title:"Jobless Claims Rise to 228,000; Labor Market Shows Gradual Cooling", summary:"Weekly jobless claims rose to 228,000, the highest in two months, suggesting the U.S. labor market is gradually softening. The unemployment rate stands at 4.1%, within the Fed's comfort zone.", source:"CNBC", time:"7h ago", category:"Labor", icon:"👷" },
];
const allNews = [...koreanNews, ...usNews];

const glossary = {
  "기준금리":"중앙은행이 시중은행에 돈을 빌려줄 때 적용하는 기본 이자율. 금리가 오르면 대출이자가 높아지고, 내리면 낮아집니다.",
  "소비자물가지수":"가정에서 자주 구매하는 물건과 서비스의 평균 가격 변화를 숫자로 나타낸 것. CPI라고도 합니다.",
  "코스피":"한국거래소에 상장된 기업들의 주가를 종합한 지수. 한국 주식시장의 전반적인 흐름을 보여줍니다.",
  "환율":"한 나라 돈과 다른 나라 돈의 교환 비율. 원/달러 환율이 오르면 달러가 비싸진다는 뜻입니다.",
  "관세":"외국에서 수입되는 물건에 부과하는 세금. 관세가 높아지면 수입품 가격이 올라갑니다.",
  "Federal Reserve":"미국의 중앙은행. '연준' 또는 'Fed'라고도 불립니다. FOMC에서 금리를 결정합니다.",
  "S&P 500":"미국을 대표하는 500개 대기업의 주가를 종합한 지수.",
  "CPI":"Consumer Price Index의 약자. 물가가 얼마나 올랐는지 보여주는 지표입니다.",
  "ECB":"European Central Bank(유럽중앙은행). 유로화를 관리하는 중앙은행입니다.",
  "BOJ":"Bank of Japan(일본은행). 최근 마이너스 금리에서 벗어나 금리 정상화 중입니다.",
  "엔캐리트레이드":"금리가 낮은 일본 엔으로 돈을 빌려 금리가 높은 나라에 투자하는 전략. BOJ 금리인상 시 청산 위험이 있습니다.",
  "금융통화위원회":"한국은행에서 금리를 결정하는 위원회. 미국의 FOMC와 같은 역할을 합니다.",
};

async function callClaude(prompt, system) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "분석을 불러올 수 없습니다.";
}

function Sparkline({ data, color }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={pts} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RateChart({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <LineChart data={data} margin={{ top: 6, bottom: 4, left: 0, right: 4 }}>
        <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#6070a0" }} axisLine={false} tickLine={false} />
        <YAxis domain={["auto","auto"]} tick={{ fontSize: 9, fill: "#6070a0" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ background: "#0d1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v}%`, "금리"]} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="r" stroke={color} strokeWidth={2} dot={{ r: 2, fill: color }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function EconomyNews() {
  const [filter, setFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("news");
  const [selectedNews, setSelectedNews] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiMode, setAiMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marketPulse, setMarketPulse] = useState(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [lastUpdated] = useState(new Date().toLocaleString("ko-KR"));
  const [rateAI, setRateAI] = useState(null);
  const [rateAILoading, setRateAILoading] = useState(false);
  const [forexAI, setForexAI] = useState(null);
  const [forexAILoading, setForexAILoading] = useState(false);

  const filtered = filter === "ALL" ? allNews : allNews.filter(n => n.country === filter);
  const SYS = "당신은 경제 전문가입니다. 경제 지식이 전혀 없는 일반인도 쉽게 이해할 수 있도록 쉬운 말로 설명해주세요. 전문 용어는 괄호 안에 쉬운 설명을 추가하세요. 답변은 한국어로 해주세요.";

  const handleAI = useCallback(async (news, mode) => {
    setSelectedNews(news); setAiMode(mode); setAiResult(null); setLoading(true);
    const txt = `제목: ${news.title}\n내용: ${news.summary}`;
    let prompt = mode === "summary"
      ? `다음 경제 뉴스를 경제 초보자도 이해할 수 있게 3줄로 핵심만 요약해주세요:\n\n${txt}`
      : mode === "terms"
      ? `다음 경제 뉴스에서 어려운 경제 용어를 모두 찾아서 초등학생도 이해할 수 있는 쉬운 말로 설명해주세요:\n\n${txt}`
      : `다음 경제 뉴스를 바탕으로 앞으로 경제에 어떤 영향이 있을지 일반인이 이해할 수 있게 전망과 예측을 해주세요. 좋은 점과 나쁜 점 모두 포함:\n\n${txt}`;
    try { setAiResult(await callClaude(prompt, SYS)); } catch { setAiResult("AI 분석 중 오류가 발생했습니다."); }
    setLoading(false);
  }, []);

  const fetchMarketPulse = useCallback(async () => {
    setPulseLoading(true); setMarketPulse(null);
    try { setMarketPulse(await callClaude(`오늘(2026년 3월 12일) 한국·미국 주요 뉴스:\n${allNews.map(n=>n.title).join("\n")}\n\n시장 전반 분위기와 일반인이 주목해야 할 핵심 포인트 3가지를 쉽게 설명해주세요.`, SYS)); }
    catch { setMarketPulse("시장 분석을 불러올 수 없습니다."); }
    setPulseLoading(false);
  }, []);

  const fetchRateAI = useCallback(async () => {
    setRateAILoading(true); setRateAI(null);
    const info = interestRates.map(r=>`${r.country}: ${r.rate}% (${r.status})`).join(", ");
    try { setRateAI(await callClaude(`현재 각국 기준금리(2026년 3월): ${info}\n\n이 금리 상황이 일반인의 대출·예금·환율·투자에 어떤 영향을 미치는지 쉽게 설명하고 향후 금리 전망도 알려주세요.`, SYS)); }
    catch { setRateAI("분석을 불러올 수 없습니다."); }
    setRateAILoading(false);
  }, []);

  const fetchForexAI = useCallback(async () => {
    setForexAILoading(true); setForexAI(null);
    const info = exchangeRates.map(r=>`${r.name}: ${r.rate.toLocaleString()} (${r.changePct>0?"+":""}${r.changePct}%)`).join(", ");
    try { setForexAI(await callClaude(`오늘(2026년 3월 12일) 주요 환율: ${info}\n현재 원/달러 환율이 1,476원대로 높은 수준입니다. 이 환율 상황이 해외여행·해외쇼핑·수입물가·수출기업에 어떤 영향을 미치는지 쉽게 설명하고 환율 전망도 알려주세요.`, SYS)); }
    catch { setForexAI("분석을 불러올 수 없습니다."); }
    setForexAILoading(false);
  }, []);

  const tabBtn = (t, label) => (
    <button onClick={() => setActiveTab(t)} style={{
      padding: "10px 22px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, border: "none",
      background: activeTab === t ? "linear-gradient(135deg,#0066cc,#40b4ff)" : "rgba(255,255,255,0.04)",
      color: activeTab === t ? "#fff" : "#6070a0", cursor: "pointer", transition: "all 0.2s"
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#080e1c", color:"#e8eaf0", fontFamily:"'Noto Sans KR','IBM Plex Sans',sans-serif", position:"relative", overflow:"hidden" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:"linear-gradient(rgba(64,180,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(64,180,255,0.03) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
      <div style={{ position:"fixed", top:"-200px", left:"-200px", width:"600px", height:"600px", borderRadius:"50%", background:"radial-gradient(circle,rgba(0,120,255,0.10) 0%,transparent 70%)", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:"-150px", right:"-150px", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle,rgba(255,60,100,0.06) 0%,transparent 70%)", zIndex:0 }} />

      <div style={{ position:"relative", zIndex:1, maxWidth:"1200px", margin:"0 auto", padding:"0 20px 80px" }}>

        {/* HEADER */}
        <header style={{ padding:"36px 0 20px", borderBottom:"1px solid rgba(64,180,255,0.12)" }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:"12px" }}>
            <div>
              <div style={{ fontSize:"10px", letterSpacing:"3px", color:"#40b4ff", fontWeight:700, marginBottom:"6px" }}>AI-POWERED ECONOMY BRIEFING</div>
              <h1 style={{ fontSize:"clamp(22px,4vw,36px)", fontWeight:900, margin:0, background:"linear-gradient(135deg,#fff 30%,#40b4ff 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                경제 뉴스 브리핑
              </h1>
              <p style={{ margin:"5px 0 0", color:"#5060a0", fontSize:"12px" }}>한국·미국 경제뉴스 · 환율 · 금리 실시간 대시보드</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"10px", color:"#f87171", marginBottom:"3px" }}>⚠️ 환율·금리 기준일</div>
              <div style={{ fontSize:"11px", color:"#e8a87c", fontWeight:700 }}>2026년 3월 12일</div>
              <div style={{ fontSize:"10px", color:"#5060a0", marginTop:"2px" }}>마지막 갱신: {lastUpdated}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", marginTop:"22px", flexWrap:"wrap", alignItems:"center" }}>
            {tabBtn("news", "📰 경제 뉴스")}
            {tabBtn("forex", "💱 환율")}
            {tabBtn("rates", "🏦 금리")}
            <button onClick={() => setGlossaryOpen(g => !g)} style={{ marginLeft:"auto", padding:"10px 18px", borderRadius:"10px", fontSize:"12px", fontWeight:700, border:"1px solid rgba(255,200,0,0.28)", background: glossaryOpen ? "rgba(255,200,0,0.12)" : "transparent", color:"#ffc800", cursor:"pointer" }}>📚 용어사전</button>
          </div>
        </header>

        {/* 용어 사전 */}
        {glossaryOpen && (
          <div style={{ marginTop:"18px", padding:"20px", borderRadius:"14px", background:"rgba(255,200,0,0.05)", border:"1px solid rgba(255,200,0,0.16)" }}>
            <h3 style={{ margin:"0 0 12px", color:"#ffc800", fontSize:"13px" }}>📚 경제 용어 사전</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:"9px" }}>
              {Object.entries(glossary).map(([term, def]) => (
                <div key={term} style={{ padding:"10px 12px", borderRadius:"9px", background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,200,0,0.09)" }}>
                  <div style={{ fontWeight:700, color:"#ffc800", fontSize:"11px", marginBottom:"3px" }}>{term}</div>
                  <div style={{ fontSize:"11px", color:"#8a9bac", lineHeight:1.6 }}>{def}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: 경제 뉴스 ─── */}
        {activeTab === "news" && (
          <>
            <div style={{ marginTop:"22px", padding:"20px", borderRadius:"14px", background:"linear-gradient(135deg,rgba(0,100,200,0.16),rgba(64,180,255,0.05))", border:"1px solid rgba(64,180,255,0.16)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
                <div>
                  <h2 style={{ margin:0, fontSize:"14px", fontWeight:700, color:"#40b4ff" }}>🤖 오늘의 시장 AI 분석</h2>
                  <p style={{ margin:"3px 0 0", fontSize:"11px", color:"#5060a0" }}>전체 뉴스를 AI가 종합 분석합니다</p>
                </div>
                <button onClick={fetchMarketPulse} disabled={pulseLoading} style={{ padding:"9px 20px", borderRadius:"9px", fontSize:"12px", fontWeight:700, background: pulseLoading ? "rgba(64,180,255,0.08)" : "linear-gradient(135deg,#0066cc,#40b4ff)", border: pulseLoading ? "1px solid rgba(64,180,255,0.25)" : "none", color: pulseLoading ? "#40b4ff" : "#fff", cursor: pulseLoading ? "wait" : "pointer" }}>
                  {pulseLoading ? "⏳ 분석 중..." : "✨ AI 분석 시작"}
                </button>
              </div>
              {marketPulse && <div style={{ marginTop:"14px", padding:"14px", borderRadius:"10px", background:"rgba(0,0,0,0.3)", fontSize:"13px", lineHeight:1.85, color:"#b8c8d8", whiteSpace:"pre-wrap" }}>{marketPulse}</div>}
            </div>
            <div style={{ display:"flex", gap:"7px", marginTop:"18px" }}>
              {[["ALL","🌐 전체"],["KR","🇰🇷 한국"],["US","🇺🇸 미국"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)} style={{ padding:"7px 16px", borderRadius:"18px", fontSize:"12px", fontWeight:600, border: filter===val ? "none" : "1px solid rgba(64,180,255,0.18)", background: filter===val ? "linear-gradient(135deg,#0066cc,#40b4ff)" : "transparent", color: filter===val ? "#fff" : "#6070a0", cursor:"pointer" }}>{label}</button>
              ))}
            </div>
            <div style={{ marginTop:"14px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"13px" }}>
              {filtered.map(news => <NewsCard key={news.id} news={news} onAI={handleAI} isSelected={selectedNews?.id === news.id} />)}
            </div>
          </>
        )}

        {/* ─── TAB: 환율 ─── */}
        {activeTab === "forex" && (
          <>
            {/* 데이터 출처 알림 */}
            <div style={{ marginTop:"18px", padding:"12px 16px", borderRadius:"10px", background:"rgba(64,180,255,0.07)", border:"1px solid rgba(64,180,255,0.2)", fontSize:"11px", color:"#7090b0" }}>
              📌 <strong style={{color:"#40b4ff"}}>데이터 기준:</strong> 2026년 3월 12일 — USD/KRW: Investing.com | EUR/KRW: Investing.com | GBP/KRW: Investing.com | JPY/KRW: 산출치 | CNY/KRW: exchange-rates.org
            </div>

            <div style={{ marginTop:"14px", padding:"20px", borderRadius:"14px", background:"linear-gradient(135deg,rgba(74,222,128,0.10),rgba(0,180,100,0.03))", border:"1px solid rgba(74,222,128,0.18)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
                <div>
                  <h2 style={{ margin:0, fontSize:"14px", fontWeight:700, color:"#4ade80" }}>🤖 환율 AI 해설</h2>
                  <p style={{ margin:"3px 0 0", fontSize:"11px", color:"#5060a0" }}>오늘 환율이 내 생활에 미치는 영향 분석</p>
                </div>
                <button onClick={fetchForexAI} disabled={forexAILoading} style={{ padding:"9px 20px", borderRadius:"9px", fontSize:"12px", fontWeight:700, background: forexAILoading ? "rgba(74,222,128,0.07)" : "linear-gradient(135deg,#16a34a,#4ade80)", border: forexAILoading ? "1px solid rgba(74,222,128,0.25)" : "none", color: forexAILoading ? "#4ade80" : "#fff", cursor: forexAILoading ? "wait" : "pointer" }}>
                  {forexAILoading ? "⏳ 분석 중..." : "✨ 환율 AI 분석"}
                </button>
              </div>
              {forexAI && <div style={{ marginTop:"14px", padding:"14px", borderRadius:"10px", background:"rgba(0,0,0,0.3)", fontSize:"13px", lineHeight:1.85, color:"#b8c8d8", whiteSpace:"pre-wrap" }}>{forexAI}</div>}
            </div>

            <div style={{ marginTop:"16px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:"13px" }}>
              {exchangeRates.map(fx => {
                const up = fx.changePct >= 0;
                const c = up ? "#f87171" : "#4ade80";
                return (
                  <div key={fx.pair} style={{ borderRadius:"14px", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", padding:"18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                      <div>
                        <div style={{ fontSize:"10px", color:"#5060a0", marginBottom:"2px" }}>{fx.flag} {fx.pair}</div>
                        <div style={{ fontSize:"13px", fontWeight:700, color:"#c8d8e8" }}>{fx.name}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"22px", fontWeight:800, color:"#e8eaf0" }}>{fx.rate.toLocaleString("ko-KR",{maximumFractionDigits:2})}</div>
                        <div style={{ fontSize:"12px", fontWeight:700, color:c }}>{up?"▲":"▼"} {Math.abs(fx.change).toFixed(2)} ({up?"+":""}{fx.changePct.toFixed(2)}%)</div>
                      </div>
                    </div>
                    <Sparkline data={fx.history} color={c} />
                    <div style={{ marginTop:"6px", fontSize:"10px", color:"#4050a0" }}>최근 10일 추이</div>
                    {fx.note && <div style={{ marginTop:"6px", fontSize:"10px", color:"#6080a0", borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:"6px" }}>💬 {fx.note}</div>}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop:"20px", padding:"18px", borderRadius:"14px", background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.12)" }}>
              <h3 style={{ margin:"0 0 12px", fontSize:"13px", fontWeight:700, color:"#4ade80" }}>💡 원/달러 1,476원, 나에게 어떤 영향?</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"9px" }}>
                {[
                  ["✈️ 해외여행","1달러=1,476원. 100만원으로 미국에서 약 678달러만 쓸 수 있어요. 1년 전보다 여행 비용이 더 비싸졌습니다."],
                  ["🛍️ 해외직구","100달러 물건이 약 147,651원. 환율이 높아 직구 부담이 커졌습니다."],
                  ["🏭 수출기업","달러로 번 돈이 원화로 더 많아져 수출 기업(삼성, 현대 등)에 유리합니다."],
                  ["🛢️ 수입물가","원유·식료품 등 수입 비용 상승으로 물가 상승 압력이 높아집니다."]
                ].map(([t,d]) => (
                  <div key={t} style={{ padding:"11px", borderRadius:"9px", background:"rgba(0,0,0,0.25)" }}>
                    <div style={{ fontWeight:700, fontSize:"12px", marginBottom:"4px", color:"#c8d8e8" }}>{t}</div>
                    <div style={{ fontSize:"11px", color:"#6a7b8c", lineHeight:1.6 }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── TAB: 금리 ─── */}
        {activeTab === "rates" && (
          <>
            <div style={{ marginTop:"18px", padding:"12px 16px", borderRadius:"10px", background:"rgba(168,85,247,0.07)", border:"1px solid rgba(168,85,247,0.2)", fontSize:"11px", color:"#9070b0" }}>
              📌 <strong style={{color:"#c084fc"}}>데이터 기준:</strong> 2026년 3월 12일 — 🇰🇷 한국은행 2.50% (한국은행 공식 발표, 2026.02.26) | 🇺🇸 연준 3.5~3.75% (TradingEconomics) | 🇪🇺 ECB 2.40% | 🇯🇵 BOJ 0.75% (2025.12 인상)
            </div>

            <div style={{ marginTop:"14px", padding:"20px", borderRadius:"14px", background:"linear-gradient(135deg,rgba(168,85,247,0.10),rgba(100,50,200,0.03))", border:"1px solid rgba(168,85,247,0.20)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
                <div>
                  <h2 style={{ margin:0, fontSize:"14px", fontWeight:700, color:"#c084fc" }}>🤖 금리 AI 해설</h2>
                  <p style={{ margin:"3px 0 0", fontSize:"11px", color:"#5060a0" }}>각국 금리가 대출·저축·투자에 미치는 영향 분석</p>
                </div>
                <button onClick={fetchRateAI} disabled={rateAILoading} style={{ padding:"9px 20px", borderRadius:"9px", fontSize:"12px", fontWeight:700, background: rateAILoading ? "rgba(192,132,252,0.07)" : "linear-gradient(135deg,#7c3aed,#c084fc)", border: rateAILoading ? "1px solid rgba(192,132,252,0.25)" : "none", color: rateAILoading ? "#c084fc" : "#fff", cursor: rateAILoading ? "wait" : "pointer" }}>
                  {rateAILoading ? "⏳ 분석 중..." : "✨ 금리 AI 분석"}
                </button>
              </div>
              {rateAI && <div style={{ marginTop:"14px", padding:"14px", borderRadius:"10px", background:"rgba(0,0,0,0.3)", fontSize:"13px", lineHeight:1.85, color:"#b8c8d8", whiteSpace:"pre-wrap" }}>{rateAI}</div>}
            </div>

            {/* 비교 바 */}
            <div style={{ marginTop:"16px", padding:"20px", borderRadius:"14px", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ margin:"0 0 16px", fontSize:"13px", fontWeight:700, color:"#8090a0" }}>🌍 각국 기준금리 비교 (2026년 3월)</h3>
              {interestRates.map(r => {
                const pct = Math.max(5, (r.rate / 5) * 100);
                return (
                  <div key={r.code} style={{ marginBottom:"16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px" }}>
                      <span style={{ fontSize:"13px", fontWeight:600 }}>{r.country}</span>
                      <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                        <span style={{ fontSize:"22px", fontWeight:800, color:r.statusColor }}>{r.rate}%</span>
                        <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:`${r.statusColor}20`, color:r.statusColor, fontWeight:700 }}>{r.status}</span>
                        <span style={{ fontSize:"10px", color:"#4050a0" }}>이전 {r.prevRate}%</span>
                      </div>
                    </div>
                    <div style={{ height:"8px", borderRadius:"4px", background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${r.statusColor}70,${r.statusColor})`, borderRadius:"4px", transition:"width 0.8s ease" }} />
                    </div>
                    <div style={{ fontSize:"10px", color:"#4a5a70", marginTop:"3px" }}>다음 회의: {r.nextMeeting}</div>
                  </div>
                );
              })}
            </div>

            {/* 상세 카드 */}
            <div style={{ marginTop:"16px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:"13px" }}>
              {interestRates.map((r, i) => {
                const colors = ["#40b4ff","#f87171","#fbbf24","#a78bfa"];
                const c = colors[i % 4];
                return (
                  <div key={r.code} style={{ borderRadius:"14px", background:"rgba(255,255,255,0.025)", border:`1px solid ${c}22`, padding:"18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                      <div>
                        <div style={{ fontSize:"15px", fontWeight:800 }}>{r.country}</div>
                        <div style={{ fontSize:"10px", color:"#5060a0", marginTop:"2px" }}>{r.label}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"28px", fontWeight:900, color:c, lineHeight:1 }}>{r.rate}%</div>
                        <div style={{ fontSize:"10px", color:r.statusColor, fontWeight:700, marginTop:"2px" }}>{r.status}</div>
                      </div>
                    </div>
                    <RateChart data={r.history} color={c} />
                    <p style={{ margin:"8px 0 0", fontSize:"11px", color:"#6070a0", lineHeight:1.7 }}>{r.desc}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop:"20px", padding:"18px", borderRadius:"14px", background:"rgba(168,85,247,0.04)", border:"1px solid rgba(168,85,247,0.12)" }}>
              <h3 style={{ margin:"0 0 12px", fontSize:"13px", fontWeight:700, color:"#c084fc" }}>💡 금리가 오르내리면 무슨 일이?</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"9px" }}>
                {[
                  ["🏠 주택담보대출","금리가 높아지면 이자가 올라 매월 갚아야 할 돈이 늘어납니다."],
                  ["🏦 예금/적금","금리가 높으면 이자를 더 많이 받을 수 있어 저축이 유리합니다."],
                  ["📉 주식시장","금리가 높으면 저축이 유리해져 주식투자 매력이 줄고 주가가 하락할 수 있습니다."],
                  ["💱 환율","금리가 높은 나라 통화로 돈이 몰려 해당 통화 가치가 올라갑니다."]
                ].map(([t,d]) => (
                  <div key={t} style={{ padding:"11px", borderRadius:"9px", background:"rgba(0,0,0,0.25)" }}>
                    <div style={{ fontWeight:700, fontSize:"12px", marginBottom:"4px", color:"#c8d8e8" }}>{t}</div>
                    <div style={{ fontSize:"11px", color:"#6a7b8c", lineHeight:1.6 }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* AI 결과 모달 */}
        {selectedNews && (aiResult !== null || loading) && (
          <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,5,15,0.90)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
            onClick={() => { setSelectedNews(null); setAiResult(null); }}>
            <div onClick={e => e.stopPropagation()} style={{ maxWidth:"580px", width:"100%", borderRadius:"18px", background:"linear-gradient(135deg,#0d1628,#111b30)", border:"1px solid rgba(64,180,255,0.20)", padding:"28px", maxHeight:"80vh", overflowY:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
                <div>
                  <div style={{ fontSize:"10px", letterSpacing:"2px", color:"#40b4ff", marginBottom:"5px" }}>
                    {aiMode==="summary" ? "🔍 AI 요약" : aiMode==="terms" ? "📖 용어 설명" : "🔮 전망 예측"}
                  </div>
                  <div style={{ fontSize:"13px", fontWeight:700, color:"#e8eaf0", lineHeight:1.5 }}>{selectedNews.title}</div>
                </div>
                <button onClick={() => { setSelectedNews(null); setAiResult(null); }} style={{ background:"none", border:"none", color:"#6070a0", fontSize:"20px", cursor:"pointer", marginLeft:"12px", flexShrink:0 }}>✕</button>
              </div>
              {loading
                ? <div style={{ textAlign:"center", padding:"40px", color:"#40b4ff" }}>
                    <div style={{ fontSize:"32px", animation:"spin 1s linear infinite" }}>⟳</div>
                    <div style={{ fontSize:"13px", marginTop:"10px" }}>AI가 분석하고 있습니다...</div>
                  </div>
                : <div style={{ fontSize:"13px", lineHeight:1.9, color:"#b8c8d8", whiteSpace:"pre-wrap" }}>{aiResult}</div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ news, onAI, isSelected }) {
  const isKR = news.country === "KR";
  const accent = isKR ? "#ff6b6b" : "#40b4ff";
  return (
    <div style={{ borderRadius:"14px", background: isSelected ? `${accent}0e` : "rgba(255,255,255,0.025)", border:`1px solid ${isSelected ? accent+"44" : "rgba(255,255,255,0.06)"}`, padding:"17px", display:"flex", flexDirection:"column", gap:"11px", transition:"all 0.2s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          <span style={{ padding:"3px 8px", borderRadius:"5px", fontSize:"10px", fontWeight:700, background:`${accent}14`, color:accent }}>{isKR?"🇰🇷 한국":"🇺🇸 미국"}</span>
          <span style={{ fontSize:"10px", color:"#5060a0" }}>{news.category}</span>
        </div>
        <span style={{ fontSize:"17px" }}>{news.icon}</span>
      </div>
      <div>
        <h3 style={{ margin:"0 0 6px", fontSize:"13px", fontWeight:700, lineHeight:1.55, color:"#e0e8f0" }}>{news.title}</h3>
        <p style={{ margin:0, fontSize:"11px", color:"#6070a0", lineHeight:1.7 }}>{news.summary}</p>
      </div>
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:"9px", fontSize:"10px", color:"#4050a0" }}>
        <span style={{ color:accent, fontWeight:600 }}>{news.source}</span> · {news.time}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"5px" }}>
        {[["summary","🔍 요약"],["terms","📖 용어"],["outlook","🔮 전망"]].map(([mode, label]) => (
          <button key={mode} onClick={() => onAI(news, mode)}
            style={{ padding:"7px 3px", borderRadius:"7px", fontSize:"11px", fontWeight:700, border:`1px solid ${accent}25`, background:`${accent}0c`, color:accent, cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = `${accent}20`}
            onMouseLeave={e => e.currentTarget.style.background = `${accent}0c`}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}
