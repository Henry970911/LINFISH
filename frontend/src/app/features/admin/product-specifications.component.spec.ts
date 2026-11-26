import { describe, expect, it } from 'vitest';
import { InventoryDraft, ProductSpecificationsComponent } from './product-specifications.component';

describe('商品規格輸入', () => {
  it('依主分類提供不同欄位，並加總獨立庫存', () => {
    const component = new ProductSpecificationsComponent();
    component.category = 'FISI';
    expect(component.fields.map(x=>x.key)).toEqual(['lengthCm']);
    component.add(); component.add();
    component.rows[0].stock=10; component.rows[1].stock=8;
    expect(component.allocated).toBe(18);
    component.category='AQUI'; expect(component.fields.some(x=>x.key==='watt')).toBe(true);
    component.category='FEEI'; expect(component.fields.some(x=>x.key==='pellet')).toBe(true);
  });
  it('同一商品的包與瓶不能混用，即使分別在不同規格', () => {
    const component = new ProductSpecificationsComponent();
    component.category='FEEI'; component.add(); component.add();
    const [first,second]=component.rows as [InventoryDraft,InventoryDraft];
    component.setSaleUnit(first.options[0],'包',5);
    expect(component.unitKindDisabled('瓶')).toBe(true);
    component.setSaleUnit(first.options[0],'包',null);
    component.setSaleUnit(second.options[0],'瓶',1);
    expect(component.unitKindDisabled('包')).toBe(true);
  });
});
