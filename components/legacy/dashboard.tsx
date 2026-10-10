"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Calendar, Target } from "lucide-react"
import { DAYS, PLAN } from "@/lib/data"
import { dayPct, streak, fmtDate, Weight } from "@/lib/store"

const TIPS = [
  {tag:"FISIOLOGIA",text:"Músculo não cresce no treino. Cresce no descanso, no sono e na comida."},
  {tag:"CONSTÂNCIA",text:"Disciplina não é motivação acumulada. É uma decisão repetida quando ela sumiu."},
  {tag:"NUTRIÇÃO",text:"Comida real não precisa de lista de ingredientes. Esse é o critério."},
  {tag:"FREQUÊNCIA",text:"Treino com 60% feito 5x supera treino com 100% feito 1x."},
  {tag:"DADOS",text:"Peso na balança é dado, não julgamento. Use como ferramenta."},
  {tag:"FUNDAMENTOS",text:"Hidratação, sono e proteína resolvem mais do que qualquer suplemento."},
  {tag:"EXECUÇÃO",text:"Você não precisa de mais informação. Precisa executar o que já sabe."},
  {tag:"RESILIÊNCIA",text:"A diferença entre quem chega e quem desiste está nos dias ruins."},
]

function Arc({pct}:{pct:number}) {
  const S=136,sw=6,r=(S-sw)/2,c=2*Math.PI*r,arc=c*.70
  const off=arc-(pct/100)*arc,elite=pct>=90
  return (
    <div style={{position:"relative",width:S,height:S,flexShrink:0}}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{transform:"rotate(144deg)"}}>
        <circle cx={S/2} cy={S/2} r={r} fill="none" stroke="rgba(73,116,127,0.18)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${arc} ${c}`}/>
        <motion.circle cx={S/2} cy={S/2} r={r} fill="none"
          stroke={elite?"#E34B26":"rgba(73,116,127,0.48)"}
          strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          initial={{strokeDashoffset:arc}} animate={{strokeDashoffset:off}}
          transition={{duration:1.5,ease:[.4,0,.2,1],delay:.2}}
          style={{filter:elite?"drop-shadow(0 0 6px rgba(227,75,38,.48))":"none"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
        <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.5}}
          style={{fontFamily:"var(--fb)",fontSize:"1.9rem",fontWeight:300,color:elite?"var(--acc)":"var(--t1)",lineHeight:1,letterSpacing:"-.03em"}}>
          {pct}%
        </motion.span>
        <span style={{fontFamily:"var(--fb)",fontSize:".50rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".20em",color:"var(--t3)"}}>ADH</span>
      </div>
    </div>
  )
}

function Spark({weights}:{weights:Weight[]}) {
  const s=[...weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-7)
  if(s.length<2) return null
  const vs=s.map(w=>w.val),mn=Math.min(...vs)-.5,mx=Math.max(...vs)+.5
  const W=54,H=20,p=3
  const x=(i:number)=>p+(i/(s.length-1))*(W-p*2)
  const y=(v:number)=>H-p-((v-mn)/(mx-mn))*(H-p*2)
  const pts=s.map((w,i)=>`${x(i)},${y(w.val)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:W,height:H,overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke="var(--acc)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={x(s.length-1)} cy={y(s[s.length-1].val)} r="2.5" fill="var(--acc)" style={{filter:"drop-shadow(0 0 4px rgba(227,75,38,.5))"}}/>
    </svg>
  )
}

function Metric({icon:I,label,value,unit,sub,acc,right,viz}:{icon:React.ElementType;label:string;value:string;unit?:string;sub?:string;acc?:boolean;right?:boolean;viz?:React.ReactNode}) {
  return (
    <div style={{padding:"13px 15px",borderRight:right?"1px solid var(--bsoft)":"none",borderBottom:"1px solid var(--bsoft)",background:"var(--surface)"}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:9}}>
        <I size={10} style={{color:"var(--t3)",flexShrink:0}}/>
        <span style={{fontFamily:"var(--fb)",fontSize:".50rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".18em",color:"var(--t3)"}}>{label}</span>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:6}}>
        <div>
          <div style={{display:"flex",alignItems:"baseline",gap:3}}>
            <span style={{fontFamily:"var(--fb)",fontSize:"1.65rem",fontWeight:300,color:acc?"var(--acc)":"var(--t1)",letterSpacing:"-.03em",lineHeight:1}}>{value}</span>
            {unit&&<span style={{fontFamily:"var(--fb)",fontSize:".55rem",fontWeight:300,color:"var(--t3)"}}>{unit}</span>}
          </div>
          {sub&&<div style={{fontFamily:"var(--fb)",fontSize:".46rem",fontWeight:500,textTransform:"uppercase",letterSpacing:".14em",color:"var(--t3)",marginTop:3}}>{sub}</div>}
        </div>
        {viz}
      </div>
    </div>
  )
}

interface Props { checked:Record<string,boolean>; weights:Weight[] }

export function Dashboard({checked,weights}:Props) {
  const [tip,setTip]=useState(0)
  useEffect(()=>{const d=new Date();setTip(Math.floor((d.getTime()-new Date(d.getFullYear(),0,0).getTime())/86400000)%TIPS.length)},[])
  const todayI=new Date().getDay()===0?6:new Date().getDay()-1
  const adh=dayPct(DAYS[todayI],checked,PLAN as never)
  const sk=streak(checked,PLAN as never,DAYS)
  const sw=[...weights].sort((a,b)=>b.date.localeCompare(a.date))
  const done=DAYS.filter(d=>dayPct(d,checked,PLAN as never)===100).length
  const wk=Math.round((done/7)*100)
  const status=adh>=90?"ELITE":adh>=70?"OPERACIONAL":"CRÍTICO"
  const h=new Date().getHours()
  const sess=h<12?"ALPHA":h<18?"BETA":"OMEGA"
  const DN=["DOM","SEG","TER","QUA","QUI","SEX","SAB"]
  const L=["S","T","Q","Q","S","S","D"]

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.22}}>

      {/* PAINEL CENTRAL */}
      <div style={{padding:"12px 12px 0"}}>
        <div className="metal" style={{padding:"15px",position:"relative",overflow:"hidden"}}>
          {/* corner marks */}
          {[{t:5,l:5},{t:5,r:5},{b:5,l:5},{b:5,r:5}].map((c,i)=>(
            <div key={i} style={{position:"absolute",width:8,height:8,
              top:"t"in c?(c as any).t:undefined,bottom:"b"in c?(c as any).b:undefined,
              left:"l"in c?(c as any).l:undefined,right:"r"in c?(c as any).r:undefined,
              borderTop:"t"in c?"1px solid rgba(227,75,38,.45)":"none",
              borderBottom:"b"in c?"1px solid rgba(227,75,38,.45)":"none",
              borderLeft:"l"in c?"1px solid rgba(227,75,38,.45)":"none",
              borderRight:"r"in c?"1px solid rgba(227,75,38,.45)":"none"}}/>
          ))}
          <div style={{fontFamily:"var(--fb)",fontSize:".50rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".22em",color:"var(--t3)",marginBottom:12}}>ÍNDICE DE ADERÊNCIA</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Arc pct={adh}/>
            <div style={{flex:1,paddingLeft:12,borderLeft:"1px solid var(--bsoft)"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:5,background:adh>=90?"var(--acc-dim)":"rgba(0,30,46,.55)",border:`1px solid ${adh>=90?"var(--bacc)":"var(--bsoft)"}`,borderRadius:6,padding:"3px 8px",marginBottom:10}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:adh>=90?"var(--acc)":"var(--hydro)"}}/>
                <span style={{fontFamily:"var(--fb)",fontSize:".46rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".16em",color:adh>=90?"var(--acc)":"var(--t2)"}}>{status}</span>
              </div>
              {[{l:"DIETA HOJE",v:adh},{l:"SEMANA",v:wk},{l:"STREAK",v:Math.min(sk*14,100)}].map(b=>(
                <div key={b.l} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontFamily:"var(--fb)",fontSize:".44rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".16em",color:"var(--t3)"}}>{b.l}</span>
                    <span style={{fontFamily:"var(--fb)",fontSize:".48rem",fontWeight:300,color:"var(--t2)"}}>{b.v}%</span>
                  </div>
                  <div className="prog"><motion.div className="prog-fill" initial={{width:0}} animate={{width:`${b.v}%`}} transition={{duration:1.3,ease:[.4,0,.2,1],delay:.4}}/></div>
                </div>
              ))}
              <div style={{marginTop:8,fontFamily:"var(--fb)",fontSize:".42rem",fontWeight:300,textTransform:"uppercase",letterSpacing:".14em",color:"var(--t4)"}}>{DN[new Date().getDay()]} · SESSÃO {sess}</div>
            </div>
          </div>
        </div>
      </div>

      {/* WEEK STRIP */}
      <div style={{margin:"12px 12px 0"}}>
        <div className="card" style={{overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
            {DAYS.map((day,idx)=>{
              const p=dayPct(day,checked,PLAN as never),done=p===100,today=idx===todayI,part=p>0&&p<100
              return (
                <div key={day} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 0",background:today?"rgba(0,32,50,.55)":"transparent",borderRight:idx<6?"1px solid var(--bsoft)":"none",borderTop:today?"2px solid var(--acc)":"2px solid transparent"}}>
                  <span style={{fontFamily:"var(--fb)",fontSize:".44rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:today?"var(--hushed)":"var(--t3)",marginBottom:5}}>{L[idx]}</span>
                  <div style={{width:17,height:17,borderRadius:4,border:done?"1px solid var(--acc)":today?"1px solid rgba(73,116,127,.50)":"1px solid var(--bsoft)",background:done?"var(--acc)":part?"var(--acc-dim)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                    {done?<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="var(--canvas)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      :part?<span style={{fontFamily:"var(--fb)",fontSize:".34rem",fontWeight:500,color:"var(--acc)"}}>{p}%</span>:null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* DIRETRIZ */}
      <div style={{margin:"12px 12px 0",background:"rgba(0,22,36,.44)",borderTop:"1px solid rgba(227,75,38,.28)",borderBottom:"1px solid rgba(227,75,38,.08)",borderRadius:10,padding:"12px 14px"}}>
        <div style={{fontFamily:"var(--fb)",fontSize:".48rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".22em",color:"var(--acc)",marginBottom:5}}>DIRETRIZ · {adh>=90?"ESTÁVEL":"ALERTA"}</div>
        <p style={{fontFamily:"var(--fb)",fontSize:".70rem",fontWeight:300,color:adh>=90?"var(--t1)":"var(--t2)",lineHeight:1.58}}>
          {adh>=90?"Sistema estável. A estrutura suporta a carga atual. Mantenha a tração.":"Desvio detectado. A inércia age sobre o vetor. Retome a rota imediatamente."}
        </p>
      </div>

      {/* MÉTRICAS */}
      <div style={{margin:"12px 12px 0",display:"grid",gridTemplateColumns:"1fr 1fr",border:"1px solid var(--bsoft)",borderRadius:10,overflow:"hidden"}}>
        <Metric icon={Flame} label="STREAK" value={String(sk)} unit="dias" acc={sk>=7} right viz={<div style={{display:"flex",alignItems:"flex-end",gap:2}}>{Array.from({length:Math.min(sk,7)||1}).map((_,i,a)=><div key={i} style={{width:3,height:5+i*4,borderRadius:2,background:sk>0?`rgba(227,75,38,${.4+(i/a.length)*.6})`:"var(--border)"}}/>)}</div>}/>
        <Metric icon={TrendingUp} label="PESO" value={sw[0]?String(sw[0].val):"—"} unit={sw[0]?"kg":""} viz={sw.length>=2?<Spark weights={weights}/>:undefined}/>
        <Metric icon={Calendar} label="SEMANA" value={String(done)} unit="/7" sub={`${wk}% DA META`} right/>
        <Metric icon={Target} label="HOJE" value={String(adh)} unit="%" acc={adh>=90} sub={status}/>
      </div>

      {/* TIP */}
      <div style={{margin:"12px 12px 12px",display:"flex",alignItems:"center",gap:8,background:"rgba(0,22,36,.50)",border:"1px solid var(--bsoft)",borderLeft:"2px solid var(--acc)",borderRadius:10,padding:"11px 12px"}}>
        <button onClick={()=>setTip(i=>(i-1+TIPS.length)%TIPS.length)} className="press" style={{background:"none",border:"none",color:"var(--t4)",padding:2,flexShrink:0}}>‹</button>
        <AnimatePresence mode="wait">
          <motion.div key={tip} initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-3}} transition={{duration:.16}} style={{flex:1}}>
            <div style={{fontFamily:"var(--fb)",fontSize:".46rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".20em",color:"var(--acc)",marginBottom:3,opacity:.85}}>{TIPS[tip].tag}</div>
            <p style={{fontFamily:"var(--fb)",fontSize:".68rem",fontWeight:300,color:"var(--t2)",lineHeight:1.55}}>{TIPS[tip].text}</p>
          </motion.div>
        </AnimatePresence>
        <button onClick={()=>setTip(i=>(i+1)%TIPS.length)} className="press" style={{background:"none",border:"none",color:"var(--t4)",padding:2,flexShrink:0}}>›</button>
      </div>

    </motion.div>
  )
}
