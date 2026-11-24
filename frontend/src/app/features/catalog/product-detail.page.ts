import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../core/services/store.service';

@Component({ selector:'app-product-detail-page', standalone:true, imports:[CurrencyPipe,FormsModule,RouterLink], template:`
  @if(product(); as p){
    <div class="container breadcrumb"><a routerLink="/catalog">所有商品</a><span>/</span><b>{{p.name}}</b></div>
    <section class="container product-detail">
      <div class="product-gallery">
        <div class="product-gallery__main" [style.background]="p.gradient">
          @if(selectedImage() || p.image; as image){<img [src]="image" [alt]="p.name" />}@else{<span class="detail-emoji">🐠</span><small>圖片待提供</small>}
        </div>
        @if((p.images?.length ?? 0)>1){<div class="thumbnail-row" aria-label="商品圖片">
          @for(image of p.images;track image;let index=$index){<button type="button" [class.active]="(selectedImage() || p.image) === image" [attr.aria-label]="'查看第 '+(index+1)+' 張商品圖片'" [attr.aria-pressed]="(selectedImage() || p.image) === image" (click)="selectedImage.set(image)"><img [src]="image" [alt]="p.name + ' 圖片 ' + (index+1)" /></button>}
        </div>}
      </div>
      <div class="product-info">
        <span class="product-info__category">商品資訊</span>
        <h1>{{p.name}}</h1>
        @if(store.isMember()) {
          @if(chosenSku(); as s){<div class="detail-price"><strong>{{s.price | currency:'TWD':'NT$':'1.0-0'}}</strong>@if(s.originalPrice !== null){<del>{{s.originalPrice | currency:'TWD':'NT$':'1.0-0'}}</del>}</div>}
          @else if(p.skus?.length){<div class="detail-price"><strong>{{priceBounds()[0] | currency:'TWD':'NT$':'1.0-0'}}@if(priceBounds()[1]!==priceBounds()[0]){ ～ {{priceBounds()[1] | currency:'TWD':'NT$':'1.0-0'}}}</strong>@if(suggestedBounds();as bounds){<del>{{bounds[0] | currency:'TWD':'NT$':'1.0-0'}}@if(bounds[1]!==bounds[0]){ ～ {{bounds[1] | currency:'TWD':'NT$':'1.0-0'}}}</del>}</div>}
        }
        @if(p.description){<div class="product-info__description" [class.expanded]="descriptionExpanded()">{{p.description}}</div><button class="description-toggle" type="button" (click)="descriptionExpanded.set(!descriptionExpanded())">{{descriptionExpanded() ? '收合商品介紹' : '查看完整介紹'}}</button>}
        @if(p.videoUrl){<a class="product-video" [href]="p.videoUrl" target="_blank" rel="noopener noreferrer">觀看商品影片 ↗</a>}
        @if(store.isMember()){
          <div class="product-purchase">
            <div class="purchase-field"><span class="purchase-field__label">商品總庫存</span><span>{{p.stock}} {{p.inventoryUnit}}</span></div>
            @if(attributeKeys().length){
              @for(key of attributeKeys();track key){<div class="purchase-field"><span class="purchase-field__label">{{attributeLabel(key)}}</span><div class="sku-options">@for(value of attributeValues(key);track value){<button type="button" class="sku-option" [class.selected]="selectedAttributes[key] === value" (click)="selectAttribute(key,value)">{{attributeValue(key,value)}}</button>}</div></div>}
              <div class="purchase-field"><span class="purchase-field__label">購買數量</span><div class="sku-options">@for(s of matchingSkus();track s.id){<button type="button" class="sku-option" [class.selected]="skuId===s.id" [disabled]="s.stockQty<=0" (click)="selectSku(s.id)">{{s.unitsPerSale}} {{p.inventoryUnit}}{{s.stockQty<=0?'（缺貨）':''}}</button>}@empty{<span>請選擇商品規格</span>}</div></div>
            }@else{<div class="purchase-field"><span class="purchase-field__label">{{p.variationName || '商品規格'}}</span><div class="sku-options">@for(s of p.skus ?? [];track s.id){<button type="button" class="sku-option" [class.selected]="skuId === s.id" [disabled]="s.stockQty <= 0" [attr.aria-pressed]="skuId === s.id" (click)="selectSku(s.id)">{{s.skuName}}{{s.stockQty <= 0 ? '（缺貨）' : ''}}</button>}@empty{<span>目前沒有可購買的規格</span>}</div></div>}
            @if(chosenSku();as s){@if(s.imageKey){<img class="sku-image" [src]="s.imageKey" [alt]="s.skuName" />}}
            <div class="purchase-field"><label class="purchase-field__label" for="product-quantity">購買組數</label><div class="quantity-control"><button type="button" aria-label="減少組數" (click)="changeQuantity(-1)" [disabled]="quantity <= 1">−</button><input id="product-quantity" type="number" min="1" step="1" [max]="chosenSku()?.stockQty || null" [(ngModel)]="quantity" /><button type="button" aria-label="增加組數" (click)="changeQuantity(1)" [disabled]="!chosenSku() || quantity >= chosenSku()!.stockQty">＋</button></div>@if(chosenSku();as s){<span class="stock-note">最多可購買 {{s.stockQty}} 組</span>}</div>
          </div>
          <button class="btn btn--coral product-add" type="button" (click)="add()">加入購物車 <span aria-hidden="true">→</span></button><p class="purchase-message" role="status">{{message()}}</p>
        }@else{<div class="detail-login"><p>登入會員後即可查看價格與購買。</p><a class="btn btn--dark" routerLink="/login">會員登入</a></div>}
      </div>
    </section>
  }@else{<div class="empty-state page-empty"><h2>商品資料載入中或不存在</h2><p>{{store.catalogError()}}</p><a routerLink="/catalog">回到商品列表</a></div>}
` })
export class ProductDetailPageComponent {
  readonly store=inject(StoreService); private route=inject(ActivatedRoute);
  private id=this.route.snapshot.paramMap.get('slug');
  readonly product=computed(()=>this.store.productBySlug(this.id));
  readonly priceBounds=computed(()=>{const prices=(this.product()?.skus??[]).flatMap(s=>s.price===null?[]:[s.price]);return prices.length?[Math.min(...prices),Math.max(...prices)]:[0,0];});
  readonly suggestedBounds=computed(()=>{const prices=(this.product()?.skus??[]).flatMap(s=>s.originalPrice===null?[]:[s.originalPrice]);return prices.length?[Math.min(...prices),Math.max(...prices)]:null;});
  skuId=0; quantity=1; message=signal('');selectedImage=signal<string|null>(null);descriptionExpanded=signal(false);
  selectedAttributes:Record<string,string>={};
  attributeKeys():string[]{return [...new Set((this.product()?.skus??[]).flatMap(s=>Object.keys(s.attributes??{})))];}
  attributeValues(key:string):string[]{return [...new Set((this.product()?.skus??[]).map(s=>String(s.attributes?.[key]??'')))];}
  attributeLabel(key:string):string{return ({lengthCm:'長度',color:'顏色',pellet:'顆粒類型',size:'尺寸',cc:'容量',pack:'包數',bottle:'瓶數',watt:'功率',litre:'容量',foot:'長度',singleHole:'單孔型號',doubleHole:'雙孔型號',largePelletPack:'大顆粒',smallPelletPack:'小顆粒',gLargePellet:'大顆粒',gSmallPellet:'小顆粒',mlLargePellet:'大顆粒',mlSmallPellet:'小顆粒',kgLargePellet:'大顆粒',kgSmallPellet:'小顆粒',g:'重量',ml:'容量',kg:'重量'} as Record<string,string>)[key]??key;}
  attributeValue(key:string,value:string):string{if(!value)return '不適用';const unit=({lengthCm:'cm',cc:'cc',pack:'包',bottle:'瓶',watt:'W',litre:'L',foot:'尺',singleHole:'型',doubleHole:'型',largePelletPack:'包',smallPelletPack:'包',gLargePellet:'g',gSmallPellet:'g',mlLargePellet:'ml',mlSmallPellet:'ml',kgLargePellet:'kg',kgSmallPellet:'kg',g:'g',ml:'ml',kg:'kg'} as Record<string,string>)[key]??'';return value+unit;}
  selectAttribute(key:string,value:string){this.selectedAttributes={...this.selectedAttributes,[key]:value};this.skuId=0;this.quantity=1;this.message.set('');const matches=(this.product()?.skus??[]).filter(s=>Object.entries(this.selectedAttributes).every(([k,v])=>String(s.attributes?.[k]??'')===v));const images=[...new Set(matches.flatMap(s=>s.imageKey?[s.imageKey]:[]))];this.selectedImage.set(images.length===1?images[0]:null);}
  matchingSkus(){const keys=this.attributeKeys();if(keys.some(k=>!(k in this.selectedAttributes)))return [];return (this.product()?.skus??[]).filter(s=>keys.every(k=>String(s.attributes?.[k]??'')===this.selectedAttributes[k]));}
  chosenSku(){return this.product()?.skus?.find(s=>s.id===this.skuId);}
  selectSku(id:number){this.skuId=id;this.quantity=1;this.selectedImage.set(this.product()?.skus?.find(s=>s.id===id)?.imageKey ?? null);this.message.set('');}
  changeQuantity(amount:number){const stock=this.chosenSku()?.stockQty ?? 0;this.quantity=Math.max(1,Math.min(stock||1,(Number(this.quantity)||1)+amount));}
  add(){const p=this.product();const s=p?.skus?.find(x=>x.id===this.skuId);if(!p || !s || s.price===null || !Number.isInteger(this.quantity) || this.quantity<1 || this.quantity>s.stockQty){this.message.set('請選擇有庫存的規格與有效數量。');return;}this.store.addToCart({...p,skuId:s.id,skuName:s.skuName,price:s.price,stock:s.stockQty},this.quantity);this.message.set('已加入購物車。');}
}
