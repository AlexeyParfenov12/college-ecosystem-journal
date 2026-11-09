import { describe, expect, it } from 'vitest'
import { advanceJournalCell, interpretJournalKey, moveJournalCell } from './keyboard'

describe('Быстрые русские клавиши журнала', () => {
  it('цифры 2–5 для числовых оценок', () => {
    expect(interpretJournalKey({key:'2'})).toEqual({type:'grade',value:'2'})
    expect(interpretJournalKey({key:'5',code:'Numpad5'})).toEqual({type:'grade',value:'5'})
    expect(interpretJournalKey({key:'1'})).toBeNull()
  })
  it('Н, П, У, О ставят логичные отметки посещаемости независимо от физического кода клавиши', () => {
    expect(interpretJournalKey({key:'н',code:'KeyY'})).toEqual({type:'attendance',value:'absent'})
    expect(interpretJournalKey({key:'П',code:'KeyG'})).toEqual({type:'attendance',value:'present'})
    expect(interpretJournalKey({key:'у',code:'KeyE'})).toEqual({type:'attendance',value:'excused'})
    expect(interpretJournalKey({key:'О',code:'KeyJ'})).toEqual({type:'attendance',value:'late'})
    expect(interpretJournalKey({key:'т',code:'KeyN'})).toBeNull()
  })
  it('З — зачёт, Shift+З или Б — незачёт', () => {
    expect(interpretJournalKey({key:'з',code:'KeyP'})).toEqual({type:'grade',value:'З'})
    expect(interpretJournalKey({key:'З',code:'KeyP',shiftKey:true})).toEqual({type:'grade',value:'НЗ'})
    expect(interpretJournalKey({key:'б',code:'Comma'})).toEqual({type:'grade',value:'НЗ'})
  })
  it('Delete/Backspace удаляет оценку, Ctrl+Z отменяет последнюю операцию', () => {
    expect(interpretJournalKey({key:'Backspace'})).toEqual({type:'delete'})
    expect(interpretJournalKey({key:'Delete'})).toEqual({type:'delete'})
    expect(interpretJournalKey({key:'я',code:'KeyZ',ctrlKey:true})).toEqual({type:'undo'})
    expect(interpretJournalKey({key:'z',code:'KeyZ',ctrlKey:true})).toEqual({type:'undo'})
  })
  it('стрелки, Enter и Escape работают в режиме таблицы', () => {
    expect(interpretJournalKey({key:'ArrowDown'})).toEqual({type:'move',direction:'down'})
    expect(interpretJournalKey({key:'Enter'})).toEqual({type:'details'})
    expect(interpretJournalKey({key:'Escape'})).toEqual({type:'stop'})
  })
  it('удержание, неверные модификаторы и посторонние клавиши не меняют данные', () => {
    expect(interpretJournalKey({key:'5',repeat:true})).toBeNull()
    expect(interpretJournalKey({key:'н',ctrlKey:true})).toBeNull()
    expect(interpretJournalKey({key:'у',altKey:true})).toBeNull()
    expect(interpretJournalKey({key:'5',metaKey:true})).toBeNull()
    expect(interpretJournalKey({key:'а'})).toBeNull()
  })
  it('стрелки не выходят за границы таблицы', () => {
    expect(moveJournalCell({row:0,column:0},'up',18,10)).toEqual({row:0,column:0})
    expect(moveJournalCell({row:17,column:9},'right',18,10)).toEqual({row:17,column:9})
    expect(moveJournalCell({row:4,column:4},'left',18,10)).toEqual({row:4,column:3})
  })
  it('автопереход идёт вниз, затем к следующему занятию', () => {
    expect(advanceJournalCell({row:1,column:0},3,2)).toEqual({row:2,column:0})
    expect(advanceJournalCell({row:2,column:0},3,2)).toEqual({row:0,column:1})
    expect(advanceJournalCell({row:2,column:1},3,2)).toEqual({row:2,column:1})
  })
})
