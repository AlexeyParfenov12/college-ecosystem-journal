import { useEffect, useRef } from 'react'
import { Pencil, Trash2, UsersRound, X } from 'lucide-react'
import type { AttendanceStatus, MarkValue } from './types'

type Props={
  name: string
  lessonLabel: string
  x:number
  y:number
  numericEnabled:boolean
  passEnabled:boolean
  onAttendance:(status:AttendanceStatus)=>void
  onMark:(value:MarkValue)=>void
  onEdit:()=>void
  onDelete:()=>void
  canDeleteManual:boolean
  onRollcall:()=>void
  onClose:()=>void
}
const flags: {status:AttendanceStatus;label:string;short:string}[]=[
  {status:'present',label:'Присутствовал',short:'✓'},
  {status:'absent',label:'Отсутствует',short:'Н'},
  {status:'late',label:'Опоздал (10 мин)',short:'ОП'},
  {status:'excused',label:'Уважительная причина',short:'У'},
]

export function CellContextMenu({name,lessonLabel,x,y,numericEnabled,passEnabled,onAttendance,onMark,onEdit,onDelete,canDeleteManual,onRollcall,onClose}:Props){
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    function onOutside(e:MouseEvent){if(!ref.current?.contains(e.target as Node))onClose()}
    function onKey(e:KeyboardEvent){if(e.key==='Escape')onClose()}
    document.addEventListener('mousedown',onOutside)
    document.addEventListener('keydown',onKey)
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return ()=>{document.removeEventListener('mousedown',onOutside);document.removeEventListener('keydown',onKey)}
  },[onClose])
  return <div className="cell-context-menu" ref={ref} role="dialog" aria-label={'Действия для '+name}
    style={{left:Math.max(8,Math.min(x,window.innerWidth-284)),top:Math.max(8,Math.min(y,window.innerHeight-365))}}>
    <div className="cell-context-heading"><div><strong>{name}</strong><small>{lessonLabel}</small></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={15}/></button></div>
    <div className="context-section-label">Быстрая посещаемость</div>
    <div className="context-attendance">
      {flags.map(item=><button key={item.status} title={item.label} onClick={()=>onAttendance(item.status)}><strong>{item.short}</strong><span>{item.label}</span></button>)}
    </div>
    <div className="context-section-label">Поставить оценку</div>
    <div className="context-marks">
      {(['2','3','4','5','З','НЗ'] as MarkValue[]).map(value=><button key={value} disabled={value==='З'||value==='НЗ'?!passEnabled:!numericEnabled} onClick={()=>onMark(value)}>{value}</button>)}
    </div>
    <button className="context-action" onClick={onEdit}><Pencil size={16}/> Подробнее / несколько оценок</button>
    <button className="context-action context-delete" onClick={onDelete} disabled={!canDeleteManual}
      title={canDeleteManual?'Удалить последнюю оценку преподавателя':'Нет ручных оценок. Результаты LMS защищены'}>
      <Trash2 size={16}/> Удалить последнюю ручную оценку
    </button>
    <button className="context-action" onClick={onRollcall}><UsersRound size={16}/> Перекличка всей группы</button>
  </div>
}
