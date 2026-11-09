import { describe, expect, it } from 'vitest'
import { advanceJournalCell, interpretJournalKey, moveJournalCell } from './keyboard'

describe('Горячие клавиши электронного журнала', () => {
  it('2–5 ставят числовую оценку, а NumPad работает так же', () => {
    expect(interpretJournalKey({key:'2',code:'Digit2'})).toEqual({type:'grade',value:'2'})
    expect(interpretJournalKey({key:'5',code:'Numpad5'})).toEqual({type:'grade',value:'5'})
    expect(interpretJournalKey({key:'1',code:'Digit1'})).toBeNull()
  })
  it('буквенные команды распознаются при русской раскладке по физической клавише', () => {
    expect(interpretJournalKey({key:'т',code:'KeyN'})).toEqual({type:'attendance',value:'absent'})
    expect(interpretJournalKey({key:'з',code:'KeyP'})).toEqual({type:'attendance',value:'present'})
    expect(interpretJournalKey({key:'д',code:'KeyL'})).toEqual({type:'attendance',value:'late'})
    expect(interpretJournalKey({key:'я',code:'KeyZ'})).toEqual({type:'grade',value:'З'})
    expect(interpretJournalKey({key:'ч',code:'KeyX'})).toEqual({type:'grade',value:'НЗ'})
  })
  it('включает понятные способы перемещения и открытия подробностей', () => {
    expect(interpretJournalKey({key:'ArrowDown'})).toEqual({type:'move',direction:'down'})
    expect(interpretJournalKey({key:'Enter'})).toEqual({type:'details'})
    expect(interpretJournalKey({key:'Escape'})).toEqual({type:'stop'})
  })
  it('не обрабатывает модификаторы, Shift и автоповтор для записи', () => {
    expect(interpretJournalKey({key:'5',repeat:true})).toBeNull()
    expect(interpretJournalKey({key:'n',code:'KeyN',ctrlKey:true})).toBeNull()
    expect(interpretJournalKey({key:'x',code:'KeyX',shiftKey:true})).toBeNull()
    expect(interpretJournalKey({key:'5',code:'Digit5',metaKey:true})).toBeNull()
  })
  it('стрелки не выходят за границы отфильтрованной таблицы', () => {
    expect(moveJournalCell({row:0,column:0},'up',18,10)).toEqual({row:0,column:0})
    expect(moveJournalCell({row:17,column:9},'right',18,10)).toEqual({row:17,column:9})
    expect(moveJournalCell({row:4,column:4},'left',18,10)).toEqual({row:4,column:3})
  })
  it('автоматический переход идёт вниз, затем к следующему занятию', () => {
    expect(advanceJournalCell({row:1,column:0},3,2)).toEqual({row:2,column:0})
    expect(advanceJournalCell({row:2,column:0},3,2)).toEqual({row:0,column:1})
    expect(advanceJournalCell({row:2,column:1},3,2)).toEqual({row:2,column:1})
  })
})
