import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SaleOptionDraft { id?: number | null; units: number | null; unitKind?: string | null; price: number | null; suggestedPrice: number | null; taxTypeId: number | null; temperatureZone: string; shippingMethodIds: number[]; isActive:boolean; imageFile?: File | null; }
export interface InventoryDraft {
  id: string | number;
  expectedStock?: number;
  attributes: Record<string, string | number | null>;
  stock: number | null;
  options: SaleOptionDraft[];
}

interface SpecField { key: string; label: string; unit?: string; type?: 'select'; options?: string[]; min?: number; max?: number; step?: number; }

@Component({
  selector: 'app-product-specifications', standalone: true, imports: [FormsModule],
  template: `
    <section class="admin-card specification-card">
      <h2>商品規格、價格與庫存</h2>
      @if (!category) { <p>請先選擇商品主分類。</p> }
      @else {
        <p>各規格的實際庫存分開記錄；同一規格的不同購買數量共用庫存。</p>
        <label>商品總數<input type="number" min="0" step="1" [(ngModel)]="total" (ngModelChange)="changed()" /></label>
        <p>已分配 {{ allocated }} ／ {{ total ?? '未設定' }}</p>
        @for (row of rows; track row.id; let index = $index) {
          <div class="specification-row">
            <div class="row-heading"><h3>規格 {{ index + 1 }}</h3><button type="button" (click)="remove(index)">移除規格</button></div>
            <div class="specification-fields">
              @for (field of fields; track field.key) {
                <label>{{ field.label }} @if(field.unit){<span>（{{ field.unit }}）</span>}
                  @if (field.type === 'select') {
                    <select [(ngModel)]="row.attributes[field.key]" (ngModelChange)="changed()"><option [ngValue]="null">不設定</option>@for(option of field.options;track option){<option [value]="option">{{ option }}</option>}</select>
                  } @else {
                    <input type="number" [min]="field.min ?? 0" [max]="field.max ?? null" [step]="field.step ?? 'any'" [(ngModel)]="row.attributes[field.key]" (ngModelChange)="changed()" />
                  }
                </label>
              }
              <label>此規格實際庫存<input type="number" min="0" step="1" [(ngModel)]="row.stock" (ngModelChange)="changed()" /></label>
            </div>
            <h4>購買選項</h4>
            @for (option of row.options; track $index; let saleIndex = $index) {
              <div class="sale-option">
                @if(category==='FISI'){<label>每次購買隻數<input type="number" min="1" step="1" [(ngModel)]="option.units" (ngModelChange)="option.unitKind='隻';changed()" /></label>}
                @else {
                  <label>每次購買件數<input type="number" min="1" step="1" [ngModel]="option.unitKind==='件' ? option.units : null" [disabled]="unitKindDisabled('件')" (ngModelChange)="setSaleUnit(option,'件',$event)" /></label>
                  <label>每次購買包數<input type="number" min="1" step="1" [ngModel]="option.unitKind==='包' ? option.units : null" [disabled]="unitKindDisabled('包')" (ngModelChange)="setSaleUnit(option,'包',$event)" /></label>
                  @if(category==='FEEI'){<label>每次購買瓶數<input type="number" min="1" step="1" [ngModel]="option.unitKind==='瓶' ? option.units : null" [disabled]="unitKindDisabled('瓶')" (ngModelChange)="setSaleUnit(option,'瓶',$event)" /></label>}
                }
                <label>實際金額（元）<input type="number" min="0" step="0.01" [(ngModel)]="option.price" (ngModelChange)="changed()" /></label>
                <label>建議金額（元）<input type="number" min="0" step="0.01" [(ngModel)]="option.suggestedPrice" (ngModelChange)="changed()" /></label>
                <label>稅別<select [(ngModel)]="option.taxTypeId" (ngModelChange)="changed()"><option [ngValue]="null">請選擇稅別</option>@for(tax of taxes;track tax.id){@if(tax.isActive){<option [ngValue]="tax.id">{{tax.name}}</option>}}</select></label>
                <label>配送溫層<select [(ngModel)]="option.temperatureZone" (ngModelChange)="option.shippingMethodIds=[];changed()"><option value="AMBIENT">常溫</option><option value="CHILLED">冷藏</option><option value="FROZEN">冷凍</option></select></label>
                <label>指定規格圖片（JPG／PNG，最多 5 MB）<input type="file" accept="image/jpeg,image/png" (change)="selectImage(option,$event)" />@if(option.imageFile){<small>待上傳：{{option.imageFile.name}}</small>}</label>
                <label class="shipping-choice"><input type="checkbox" [(ngModel)]="option.isActive" (ngModelChange)="changed()" /> 啟用此購買選項</label>
                <button type="button" (click)="removeOption(row,saleIndex)" [disabled]="row.options.length === 1">移除選項</button>
              </div>
              <fieldset><legend>限用物流（未勾選時允許相同溫層物流）</legend>@for(method of shipping;track method.id){@if(method.isActive && method.temperatureZone === option.temperatureZone){<label class="shipping-choice"><input type="checkbox" [checked]="option.shippingMethodIds.includes(method.id)" (change)="setShipping(option,method.id,$any($event.target).checked)" /> {{method.name}}</label>}}</fieldset>
            }
            <button type="button" (click)="addOption(row)">＋ 新增購買數量</button>
          </div>
        }
        <button type="button" (click)="add()">＋ 新增規格</button>
      }
    </section>
  `,
  styles: [`
    .specification-card { display:grid; gap:16px; }
    .specification-row { border:1px solid #dce7e0; border-radius:12px; padding:20px; display:grid; gap:16px; }
    .row-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .specification-fields,.sale-option { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; align-items:end; }
    label { display:grid; gap:6px; min-width:0; font-size:0.95rem; font-weight:600; } h2,h3,h4,p { margin:0; }
    input:not([type=checkbox]),select { box-sizing:border-box; width:100%; min-width:0; min-height:46px; padding:10px 12px; border:1px solid #d7e2dc; border-radius:8px; background:#fff; font:inherit; }
    input[type=file] { padding:8px; font-size:0.85rem; } input:disabled,select:disabled { background:#f0f3f1; color:#84918a; }
    button { border:1px solid #cbded3; border-radius:8px; background:white; color:#175844; padding:10px 14px; cursor:pointer; }
    button:disabled { opacity:.5; cursor:not-allowed; } fieldset { border:1px solid #dce7e0; border-radius:8px; padding:12px; }
    .shipping-choice { display:flex; align-items:center; gap:8px; font-size:1rem; font-weight:500; } .shipping-choice input { width:auto; min-height:0; }
  `]
})
export class ProductSpecificationsComponent {
  @Input() category = '';
  @Input() rows: InventoryDraft[] = [];
  @Input() total: number | null = null;
  @Input() taxes: {id:number;name:string;isActive:boolean}[] = [];
  @Input() shipping: {id:number;name:string;temperatureZone:string;isActive:boolean}[] = [];
  @Output() draftChange = new EventEmitter<{rows: InventoryDraft[]; total: number | null}>();

  readonly fish: SpecField[] = [
    {key:'lengthCm',label:'長度',unit:'cm',min:0.1,max:500,step:0.1},
    {key:'color',label:'顏色',type:'select',options:['黑色','紅色','彩色','白色','橘色','黃色','藍色','綠色']},
  ];
  readonly equipment: SpecField[] = [
    {key:'size',label:'尺寸',type:'select',options:['S','M','L','XL','XXL']},
    {key:'cc',label:'容量',unit:'cc'},
    {key:'watt',label:'功率',unit:'W'}, {key:'litre',label:'容量',unit:'L'},
    {key:'foot',label:'長度',unit:'尺'}, {key:'singleHole',label:'單孔型號',unit:'型'},
    {key:'doubleHole',label:'雙孔型號',unit:'型'},
  ];
  readonly feed: SpecField[] = [
    {key:'pellet',label:'顆粒類型（包）',type:'select',options:['大顆粒','小顆粒']},
    {key:'size',label:'尺寸',type:'select',options:['S','M','L','XL','XXL']},
    ...['g','ml','kg'].flatMap(unit => [
      {key:`${unit}LargePellet`,label:'大顆粒',unit}, {key:`${unit}SmallPellet`,label:'小顆粒',unit},
    ]),
    {key:'ml',label:'容量',unit:'ml'}, {key:'g',label:'重量',unit:'g'}, {key:'kg',label:'重量',unit:'kg'},
  ];
  get fields(): SpecField[] { return this.category === 'FISI' ? this.fish : this.category === 'AQUI' ? this.equipment : this.category === 'FEEI' ? this.feed : []; }
  get allocated(): number { return this.rows.reduce((sum,row)=>sum+(Number(row.stock)||0),0); }
  unitKindDisabled(unit: string): boolean { const kinds=this.rows.flatMap(r=>r.options).filter(o=>o.units!==null && o.unitKind).map(o=>o.unitKind);return kinds.some(k=>k!==unit); }
  setSaleUnit(option:SaleOptionDraft,unit:string,value:number|null):void {option.units=value;option.unitKind=value===null?null:unit;this.changed();}
  private newOption(units: number | null): SaleOptionDraft { return {units,unitKind:this.category==='FISI'?'隻':null,price:null,suggestedPrice:null,taxTypeId:null,temperatureZone:'AMBIENT',shippingMethodIds:[],isActive:true}; }
  add(): void { this.rows = [...this.rows,{id:crypto.randomUUID(),attributes:{},stock:null,options:[this.newOption(this.category==='FISI'?1:null)]}]; this.changed(); }
  remove(index: number): void { this.rows = this.rows.filter((_,i)=>i!==index); this.changed(); }
  addOption(row: InventoryDraft): void { row.options.push(this.newOption(null)); this.changed(); }
  setShipping(option: SaleOptionDraft, id: number, checked: boolean): void { option.shippingMethodIds = checked ? [...option.shippingMethodIds,id] : option.shippingMethodIds.filter(x=>x!==id); this.changed(); }
  selectImage(option: SaleOptionDraft, event: Event): void { const input=event.target as HTMLInputElement;option.imageFile=input.files?.[0]??null;input.value='';this.changed(); }
  removeOption(row: InventoryDraft, index: number): void { row.options.splice(index,1); this.changed(); }
  changed(): void { this.draftChange.emit({rows:this.rows,total:this.total}); }
}
