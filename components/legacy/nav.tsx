"use client"
import { motion } from "framer-motion"
import { LayoutDashboard, Utensils, TrendingUp, MoreHorizontal } from "lucide-react"
export type Tab = "home"|"dieta"|"evolucao"|"mais"
const TABS: {id:Tab;icon:React.ElementType;label:string}[] = [
  {id:"home",icon:LayoutDashboard,label:"Home"},
  {id:"dieta",icon:Utensils,label:"Dieta"},
  {id:"evolucao",icon:TrendingUp,label:"Evolução"},
  {id:"mais",icon:MoreHorizontal,label:"Mais"},
]
export function Nav({active,onChange}:{active:Tab;onChange:(t:Tab)=>void}) {
  return (
    <nav className="nav">
      {TABS.map(({id,icon:Icon,label}) => {
        const on = active===id
        return (
          <button key={id} onClick={()=>onChange(id)} className="nav-btn press">
            {on && <motion.div layoutId="nl" className="nav-line" transition={{type:"spring",stiffness:500,damping:40}}/>}
            <Icon size={18} style={{color:on?"var(--acc)":"var(--t3)",strokeWidth:on?2:1.5,transition:"color 0.15s"}}/>
            <span style={{fontFamily:"var(--fb)",fontSize:"0.50rem",fontWeight:on?500:400,textTransform:"uppercase",letterSpacing:"0.14em",color:on?"var(--acc)":"var(--t3)",transition:"color 0.15s"}}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
