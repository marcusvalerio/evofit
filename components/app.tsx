"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Nav, Tab } from "@/components/nav"
import { Dashboard } from "@/components/dashboard"
import { DAYS, PLAN, MEALS_ORDER } from "@/lib/data"
import { load, save, pad, todayStr, todayIdx, dayPct, Weight } from "@/lib/store"

const MEAL_LABEL: Record<string,string> = {Cafe:"Café da Manhã",Almoco:"Almoço",Lanche:"Lanche da Tarde",Jantar:"Jantar"}

function getMealPct(day:string,meal:string,checked:Record<string,boolean>) {
  const items=(PLAN as never as Record<string,Record<string,unknown[]>>)[day]?.[meal]||[]
  const done=items.filter((_:unknown,i:number)=>checked[`${day}__${meal}__${i}`]).length
  return {done,total:items.length,pct:items.length?Math.round((done/items.length)*100):0}
}

export function App() {
  const [hydrated,setHydrated]=useState(false)
  const [tab,setTab]=useState<Tab>("home")
  const [selDay,setSelDay]=useState(todayIdx())
  const [checked,setChecked]=useState<Record<string,boolean>>({})
  const [weights,setWeights]=useState<Weight[]>([])
  const [wInput,setWInput]=useState("")

  useEffect(()=>{
    setChecked(load("evo_ch",{}))
    setWeights(load("evo_wt",[]))
    setHydrated(true)
  },[])
  useEffect(()=>{if(hydrated)save("evo_ch",checked)},[checked,hydrated])
  useEffect(()=>{if(hydrated)save("evo_wt",weights)},[weights,hydrated])

  const toggle=(k:string)=>setChecked(p=>({...p,[k]:!p[k]}))
  const addWeight=()=>{
    const v=parseFloat(wInput)
    if(!isNaN(v)&&v>0){
      const date=todayStr()
      setWeights(p=>[...p.filter(w=>w.date!==date),{date,val:v}])
      setWInput("")
    }
  }

  const today=todayIdx()
  const currentDay=DAYS[selDay]
  const L=["S","T","Q","Q","S","S","D"]
  const DN=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
  const curDayPct=dayPct(currentDay,checked,PLAN as never)

  if(!hydrated) return (
    <div style={{position:"fixed",inset:0,background:"var(--canvas)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="blink" style={{fontFamily:"var(--fl)",fontSize:"3rem",color:"var(--t1)",letterSpacing:".18em"}}>EVO</div>
    </div>
  )

  return (
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100dvh",background:"var(--canvas)",position:"relative"}}>

      {/* HEADER */}
      <header className="pt-safe" style={{position:"sticky",top:0,zIndex:40,background:"rgba(0,18,30,.92)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",borderBottom:"1px solid var(--bsoft)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px"}}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.12}}>
              {tab==="home"
                ? <span style={{fontFamily:"var(--fl)",fontSize:"1.2rem",letterSpacing:".14em",color:"var(--t1)"}}>EVO</span>
                : <span style={{fontFamily:"var(--ft)",fontSize:".70rem",textTransform:"uppercase",letterSpacing:".18em",color:"var(--t2)"}}>{tab==="dieta"?`${currentDay} · ${curDayPct}%`:tab==="evolucao"?"EVOLUÇÃO":"MAIS"}</span>
              }
            </motion.div>
          </AnimatePresence>
          {tab==="dieta"&&(
            <div style={{fontFamily:"var(--fb)",fontSize:".50rem",fontWeight:300,textTransform:"uppercase",letterSpacing:".14em",color:"var(--t3)"}}>{DN[selDay]}</div>
          )}
        </div>
        {tab==="dieta"&&<div className="prog"><div className="prog-fill" style={{width:`${curDayPct}%`}}/></div>}
      </header>

      {/* MAIN */}
      <main style={{paddingBottom:80}}>
        <AnimatePresence mode="wait">

          {/* HOME */}
          {tab==="home"&&(
            <motion.div key="home" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>
              <Dashboard checked={checked} weights={weights}/>
            </motion.div>
          )}

          {/* DIETA */}
          {tab==="dieta"&&(
            <motion.div key="dieta" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>
              {/* Day Picker */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--bsoft)"}}>
                {DAYS.map((day,idx)=>{
                  const p=dayPct(day,checked,PLAN as never),done=p===100,sel=idx===selDay,isT=idx===today
                  return (
                    <button key={day} onClick={()=>setSelDay(idx)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:"10px 0",background:sel?"rgba(0,28,44,.55)":"transparent",border:"none",borderRight:idx<6?"1px solid var(--bsoft)":"none",borderTop:sel?"2px solid var(--acc)":"2px solid transparent",cursor:"pointer"}}>
                      <span style={{fontFamily:"var(--fb)",fontSize:".44rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:isT?"var(--hushed)":"var(--t3)"}}>{L[idx]}</span>
                      <div style={{width:18,height:18,borderRadius:4,border:done?"1px solid var(--acc)":sel?"1px solid rgba(73,116,127,.50)":"1px solid var(--bsoft)",background:done?"var(--acc)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {done&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="var(--canvas)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {!done&&p>0&&<span style={{fontFamily:"var(--fb)",fontSize:".34rem",fontWeight:500,color:"var(--t3)"}}>{p}%</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
              {/* Meals */}
              {MEALS_ORDER.map(meal=>{
                const {done,total,pct}=getMealPct(currentDay,meal,checked)
                const items=(PLAN as never as Record<string,Record<string,{name:string;qty:string;supl?:boolean}[]>>)[currentDay]?.[meal]||[]
                return (
                  <div key={meal}>
                    <div style={{padding:"8px 16px",background:"rgba(0,18,30,.55)",borderBottom:"1px solid var(--bsoft)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        {pct===100&&<div style={{width:5,height:5,borderRadius:"50%",background:"var(--acc)",flexShrink:0}}/>}
                        <span style={{fontFamily:"var(--ft)",fontSize:".58rem",textTransform:"uppercase",letterSpacing:".16em",color:pct===100?"var(--acc)":"var(--t3)"}}>{MEAL_LABEL[meal]||meal}</span>
                      </div>
                      <span style={{fontFamily:"var(--fb)",fontSize:".52rem",fontWeight:300,color:"var(--t4)"}}>{done}/{total}</span>
                    </div>
                    <div className="prog"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
                    {items.map((it,i)=>{
                      const k=`${currentDay}__${meal}__${i}`,on=!!checked[k]
                      return (
                        <motion.button key={i} onClick={()=>toggle(k)} className="press"
                          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*.02}}
                          style={{width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"transparent",border:"none",borderBottom:i<items.length-1?"1px solid var(--bsoft)":"none"}}>
                          <div style={{width:19,height:19,flexShrink:0,borderRadius:5,border:`1px solid ${on?"var(--acc)":"var(--border)"}`,background:on?"var(--acc)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}>
                            {on&&<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="var(--canvas)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div style={{flex:1}}>
                            <span style={{fontFamily:"var(--fb)",fontSize:".82rem",fontWeight:300,color:on?"var(--t4)":"var(--t2)",textDecoration:on?"line-through":"none",textDecorationColor:"var(--border)"}}>{it.name}</span>
                            {it.supl&&<span style={{marginLeft:8,fontFamily:"var(--fb)",fontSize:".44rem",fontWeight:500,textTransform:"uppercase",letterSpacing:".18em",color:"var(--acc)",border:"1px solid var(--bacc)",borderRadius:4,padding:"1px 5px",verticalAlign:"middle"}}>SUPL</span>}
                          </div>
                          <span style={{fontFamily:"var(--fb)",fontSize:".58rem",fontWeight:300,color:"var(--t4)",letterSpacing:".06em",flexShrink:0}}>{it.qty}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* EVOLUÇÃO */}
          {tab==="evolucao"&&(
            <motion.div key="evolucao" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>
              <div style={{padding:"14px 16px",borderBottom:"1px solid var(--bsoft)"}}>
                <div style={{fontFamily:"var(--fb)",fontSize:".50rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".20em",color:"var(--t3)",marginBottom:10}}>REGISTRAR PESO</div>
                <div style={{display:"flex",gap:8}}>
                  <input type="number" step="0.1" placeholder="92.5" value={wInput} onChange={e=>setWInput(e.target.value)} className="inp" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&addWeight()}/>
                  <button onClick={addWeight} className="btn-out" style={{whiteSpace:"nowrap"}}>SALVAR</button>
                </div>
              </div>
              {[...weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map((w,i)=>(
                <div key={w.date} className="row" style={{borderBottom:"1px solid var(--bsoft)"}}>
                  <span style={{fontFamily:"var(--fb)",fontSize:".60rem",fontWeight:300,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".10em"}}>{w.date.split("-").reverse().slice(0,2).join("/")}</span>
                  <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                    {i>0&&[...weights].sort((a,b)=>b.date.localeCompare(a.date))[i-1]&&(()=>{
                      const prev=[...weights].sort((a,b)=>b.date.localeCompare(a.date))[i-1]
                      const diff=(w.val-prev.val).toFixed(1)
                      const down=w.val<prev.val
                      return <span style={{fontFamily:"var(--fb)",fontSize:".52rem",fontWeight:300,color:down?"var(--acc)":"var(--t4)"}}>{down?"":(+diff>0?"+":"")}{diff}</span>
                    })()}
                    <span style={{fontFamily:"var(--fl)",fontSize:"1.1rem",color:"var(--t1)",letterSpacing:"-.01em"}}>{w.val}</span>
                    <span style={{fontFamily:"var(--fb)",fontSize:".52rem",fontWeight:300,color:"var(--t3)"}}>kg</span>
                  </div>
                </div>
              ))}
              {weights.length===0&&(
                <div style={{padding:"32px 16px",textAlign:"center",fontFamily:"var(--fb)",fontSize:".68rem",fontWeight:300,color:"var(--t4)",textTransform:"uppercase",letterSpacing:".14em"}}>Nenhum registro ainda</div>
              )}
            </motion.div>
          )}

          {/* MAIS */}
          {tab==="mais"&&(
            <motion.div key="mais" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>
              <div style={{padding:"16px"}}>
                <div style={{fontFamily:"var(--fb)",fontSize:".50rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".20em",color:"var(--t3)",marginBottom:14}}>EM DESENVOLVIMENTO</div>
                {["Lista de Compras","Receitas","Gastos","Perfil"].map(item=>(
                  <div key={item} style={{padding:"14px 0",borderBottom:"1px solid var(--bsoft)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:"var(--ft)",fontSize:".68rem",textTransform:"uppercase",letterSpacing:".12em",color:"var(--t2)"}}>{item}</span>
                    <span style={{fontFamily:"var(--fb)",fontSize:".46rem",fontWeight:500,textTransform:"uppercase",letterSpacing:".14em",color:"var(--t4)",border:"1px solid var(--bsoft)",borderRadius:4,padding:"3px 7px"}}>EM BREVE</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <Nav active={tab} onChange={setTab}/>
    </div>
  )
}
