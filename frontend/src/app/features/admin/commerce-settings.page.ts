import { Component,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient,HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
interface Tax {id:number;name:string;ratePercent:number;priceIncludesTax:boolean;allowMixed:boolean;isActive:boolean}
interface Shipping {id:number;name:string;temperatureZone:string;baseFee:number;freeThreshold:number|null;isActive:boolean}
@Component({selector:'app-commerce-settings',standalone:true,imports:[FormsModule],template:`
<div class="admin-page-head"><div><span>營運設定</span><h1>稅別與物流設定</h1><p>設定商品稅別、配送溫層、運費與免運門檻。</p></div></div>
@if(message()){<p role="status">{{message()}}</p>}
<section class="admin-card editor-card"><h2>稅別管理</h2><form (ngSubmit)="saveTax()" #taxForm="ngForm"><div class="editor-two">
<label>稅別名稱<input name="name" [(ngModel)]="tax.name" maxlength="100" required /></label><label>稅率（%）<input name="rate" [(ngModel)]="tax.ratePercent" type="number" min="0" max="100" step="0.0001" required /></label>
<label>售價是否含稅<select name="included" [(ngModel)]="tax.priceIncludesTax"><option [ngValue]="true">已含稅</option><option [ngValue]="false">未含稅，結帳時加稅</option></select></label>
<label>混合稅別結帳<select name="mixed" [(ngModel)]="tax.allowMixed"><option [ngValue]="true">允許與其他稅別一起結帳</option><option [ngValue]="false">不允許混合稅別</option></select></label>
<label><input type="checkbox" name="active" [(ngModel)]="tax.isActive" /> 啟用稅別</label></div><button class="admin-primary-btn" [disabled]="busy() || taxForm.invalid">{{taxId?'更新稅別':'新增稅別'}}</button>@if(taxId){<button type="button" (click)="resetTax()">取消編輯</button>}</form>
@for(t of taxes();track t.id){<div class="setting-row"><p><b>{{t.name}}</b><small>{{t.ratePercent}}% · {{t.priceIncludesTax?'含稅':'未稅'}} · {{t.allowMixed?'可混合結帳':'不可混合結帳'}} · {{t.isActive?'啟用':'停用'}}</small></p><button type="button" (click)="editTax(t)">編輯</button></div>}@empty{<p>尚無稅別，請先新增商品適用的稅別。</p>}</section>
<section class="admin-card editor-card"><h2>物流管理</h2><form (ngSubmit)="saveShipping()" #shipForm="ngForm"><div class="editor-two">
<label>物流名稱<input name="name" [(ngModel)]="ship.name" maxlength="100" required /></label><label>配送溫層<select name="zone" [(ngModel)]="ship.temperatureZone"><option value="AMBIENT">常溫</option><option value="CHILLED">冷藏</option><option value="FROZEN">冷凍</option></select></label>
<label>運費<input name="fee" [(ngModel)]="ship.baseFee" type="number" min="0" step="0.01" required /></label><label>免運門檻（留空為不提供免運）<input name="threshold" [(ngModel)]="ship.freeThreshold" type="number" min="0" step="0.01" /></label>
<label><input type="checkbox" name="active" [(ngModel)]="ship.isActive" /> 啟用物流</label></div><button class="admin-primary-btn" [disabled]="busy() || shipForm.invalid">{{shipId?'更新物流':'新增物流'}}</button>@if(shipId){<button type="button" (click)="resetShipping()">取消編輯</button>}</form>
@for(s of shipping();track s.id){<div class="setting-row"><p><b>{{s.name}}</b><small>{{zoneName(s.temperatureZone)}} · 運費 {{s.baseFee}} · {{s.freeThreshold === null?'無免運門檻':'滿 '+s.freeThreshold+' 免運'}} · {{s.isActive?'啟用':'停用'}}</small></p><button type="button" (click)="editShipping(s)">編輯</button></div>}</section>
`,styleUrl: '../../css/admin/commerce-settings.page.scss'})
export class CommerceSettingsPageComponent {
 private http=inject(HttpClient);private base=`${environment.apiBaseUrl}/admin/settings`;taxes=signal<Tax[]>([]);shipping=signal<Shipping[]>([]);message=signal('');busy=signal(false);taxId:number|null=null;shipId:number|null=null;
 tax={name:'',ratePercent:0,priceIncludesTax:true,allowMixed:true,isActive:true};ship:{name:string;temperatureZone:string;baseFee:number;freeThreshold:number|null;isActive:boolean}={name:'',temperatureZone:'AMBIENT',baseFee:0,freeThreshold:null,isActive:true};
 constructor(){void this.load();}async load(){try{const [t,s]=await Promise.all([firstValueFrom(this.http.get<Tax[]>(`${this.base}/taxes`)),firstValueFrom(this.http.get<Shipping[]>(`${this.base}/shipping`))]);this.taxes.set(t);this.shipping.set(s);}catch(e){this.fail(e);}}
 editTax(t:Tax){this.taxId=t.id;this.tax={name:t.name,ratePercent:t.ratePercent,priceIncludesTax:t.priceIncludesTax,allowMixed:t.allowMixed,isActive:t.isActive};}resetTax(){this.taxId=null;this.tax={name:'',ratePercent:0,priceIncludesTax:true,allowMixed:true,isActive:true};}
 editShipping(s:Shipping){this.shipId=s.id;this.ship={name:s.name,temperatureZone:s.temperatureZone,baseFee:s.baseFee,freeThreshold:s.freeThreshold,isActive:s.isActive};}resetShipping(){this.shipId=null;this.ship={name:'',temperatureZone:'AMBIENT',baseFee:0,freeThreshold:null,isActive:true};}
 zoneName(zone:string){return ({AMBIENT:'常溫',CHILLED:'冷藏',FROZEN:'冷凍'} as Record<string,string>)[zone]??zone;}
 async saveTax(){this.busy.set(true);try{const url=`${this.base}/taxes`;await firstValueFrom(this.taxId?this.http.put(`${url}/${this.taxId}`,this.tax):this.http.post(url,this.tax));this.resetTax();this.message.set('稅別已儲存。');await this.load();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
 async saveShipping(){this.busy.set(true);try{const url=`${this.base}/shipping`;await firstValueFrom(this.shipId?this.http.put(`${url}/${this.shipId}`,this.ship):this.http.post(url,this.ship));this.resetShipping();this.message.set('物流已儲存。');await this.load();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
 private fail(e:unknown){this.message.set(e instanceof HttpErrorResponse&&e.error?.message?e.error.message:'設定儲存或載入失敗。');}
}
