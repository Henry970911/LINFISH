import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminCommercePageComponent } from './admin-commerce.page';
import { vi } from 'vitest';

describe('商品分類操作', () => {
  it('新增商品資料不完整時列出缺少的欄位並停止送出', async () => {
    await TestBed.configureTestingModule({ imports: [AdminCommercePageComponent], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const component = TestBed.createComponent(AdminCommercePageComponent).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.url.endsWith('/main-categories')).flush([]);
    http.expectOne(r => r.url.endsWith('/categories')).flush([]);
    http.expectOne(r => r.url.endsWith('/products')).flush([]);
    http.expectOne(r => r.url.endsWith('/settings/taxes')).flush([]);
    http.expectOne(r => r.url.endsWith('/settings/shipping')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    component.mainCategory = 'FISI'; component.form.categoryId = 1;
    component.form.productName = '魚'; component.form.status = 'ACTIVE';
    component.inventoryRows = [{ id: 'a', attributes: {}, stock: 10, options: [{ units: null, unitKind: '隻', price: null, suggestedPrice: null, taxTypeId: null, temperatureZone: 'AMBIENT', shippingMethodIds: [], isActive: true }] }];
    const showModal = vi.fn();
    await component.saveProduct({ showModal } as unknown as HTMLDialogElement);
    expect(showModal).toHaveBeenCalledOnce();
    expect(component.validationIssues.join(' ')).toContain('商品說明');
    expect(component.validationIssues.join(' ')).toContain('商品總數');
    expect(component.validationIssues.join(' ')).toContain('購買數量');
    expect(component.validationIssues.join(' ')).toContain('實際金額');
    expect(component.validationIssues.join(' ')).toContain('稅別');
    http.expectNone(r => r.method === 'POST');
    http.verify();
  });
  it('載入既有共用庫存後顯示規格及庫存', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [AdminCommercePageComponent], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommercePageComponent);
    const http = TestBed.inject(HttpTestingController);
    const product = { id: 8, productNo: 'P8', categoryId: 2, productName: '魚', categoryName: '魚類', description: '說明', status: 'ACTIVE', proNo: 'FISI', image: null, minimumPrice: 100, maximumPrice: 100, stock: 50, videoUrl: null, variationName: '商品規格', variationMode: 'MULTI', usesSharedInventory: true };
    http.expectOne(r => r.url.endsWith('/main-categories')).flush([{ proNo: 'FISI', name: '觀賞魚類' }]);
    http.expectOne(r => r.url.endsWith('/categories')).flush([{ id: 2, proNo: 'FISI', categoryNo: 'fish', categoryName: '魚類' }]);
    http.expectOne(r => r.url.endsWith('/products')).flush([product]);
    http.expectOne(r => r.url.endsWith('/settings/taxes')).flush([]);
    http.expectOne(r => r.url.endsWith('/settings/shipping')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.componentInstance.edit(product);
    http.expectOne(r => r.url.endsWith('/products/8/skus')).flush([]);
    http.expectOne(r => r.url.endsWith('/products/8/images')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    http.expectOne(r => r.url.endsWith('/inventory-products/8')).flush([{ id: 1, attributes: { lengthCm: 12 }, stock: 50, expectedStock: 50, options: [{ id: 3, units: 1, unitKind: '隻', price: 100, suggestedPrice: null, taxTypeId: null, temperatureZone: 'AMBIENT', shippingMethodIds: [], isActive: true }] }]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('已分配 (50) | 50');
    expect(fixture.nativeElement.querySelector('.specification-row')).not.toBeNull();
    http.verify();
    vi.restoreAllMocks();
  });
  it('商品儲存成功後顯示倒數並返回列表頂端', async () => {
    await TestBed.configureTestingModule({ imports: [AdminCommercePageComponent], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommercePageComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.url.endsWith('/main-categories')).flush([]);
    http.expectOne(r => r.url.endsWith('/categories')).flush([]);
    http.expectOne(r => r.url.endsWith('/products')).flush([]);
    http.expectOne(r => r.url.endsWith('/settings/taxes')).flush([]);
    http.expectOne(r => r.url.endsWith('/settings/shipping')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    const product = { id: 8, productNo: 'P8', categoryId: 2, productName: '測試商品', categoryName: '用具', description: '說明', status: 'DRAFT', proNo: 'AQUI', image: null, minimumPrice: null, maximumPrice: null, stock: 0, videoUrl: null, variationName: null, variationMode: 'MULTI', usesSharedInventory: false };
    component.products.set([product]);
    component.selected.set(product);
    component.editingId = product.id;
    component.editorOpen = true;
    component.form.variationMode = 'MULTI';
    vi.spyOn(component, 'refresh').mockResolvedValue();
    vi.spyOn(component, 'selectProduct').mockResolvedValue();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const showModal = vi.fn();
    const close = vi.fn();
    const successDialog = { showModal, close, open: true } as unknown as HTMLDialogElement;
    const save = component.saveProduct(undefined, successDialog);
    http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/products/8')).flush({});
    await save;
    expect(showModal).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(component.transitionSeconds()).toBe(0);
    expect(component.transitioning()).toBe(false);
    expect(alert).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(component.editorOpen).toBe(false);
    expect(component.editingId).toBeNull();
    alert.mockRestore();
    scroll.mockRestore();
    http.verify();
  });
  it('只顯示所選主分類的次分類，且不顯示內部代碼', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommercePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommercePageComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(request => request.url.endsWith('/main-categories')).flush([
      { proNo: 'FISI', name: '觀賞魚類' }, { proNo: 'AQUI', name: '水族用具' },
    ]);
    http.expectOne(request => request.url.endsWith('/categories')).flush([
      { id: 1, proNo: 'FISI', categoryNo: 'FISI0000', categoryName: '特殊魚' },
      { id: 2, proNo: 'AQUI', categoryNo: 'AQUI0000', categoryName: '濾材類' },
      { id: 3, proNo: 'AQUI', categoryNo: 'AQUI0001', categoryName: '過濾器' },
    ]);
    http.expectOne(request => request.url.endsWith('/products')).flush([]);
    http.expectOne(request => request.url.endsWith('/settings/taxes')).flush([]);
    http.expectOne(request => request.url.endsWith('/settings/shipping')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    await fixture.whenStable();
    expect(fixture.componentInstance.categories().length).toBe(3);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.admin-primary-btn') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    const main: HTMLSelectElement = fixture.nativeElement.querySelector('select[name="mainCategory"]');
    main.value = 'AQUI';
    main.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select[name="categoryId"]');
    const labels = Array.from(select.options).map(option => option.textContent?.trim());
    expect(labels).toEqual(['請選擇次分類', '濾材類', '過濾器']);
    expect(select.textContent).not.toContain('AQUI');
    expect(fixture.nativeElement.textContent).not.toContain('商品編號');
    fixture.componentInstance.form.categoryId = 2;
    main.value = 'FISI';
    main.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.categoryId).toBe(0);
    expect(Array.from(select.options).map(option => option.textContent?.trim())).toEqual(['請選擇次分類', '特殊魚']);
    http.verify();
  });
  it('編輯已存在商品時保留主分類與次分類', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => { });
    await TestBed.configureTestingModule({ imports: [AdminCommercePageComponent], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommercePageComponent); fixture.detectChanges(); const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.url.endsWith('/main-categories')).flush([{ proNo: 'AQUI', name: '水族用具' }]);
    http.expectOne(r => r.url.endsWith('/categories')).flush([{ id: 2, proNo: 'AQUI', categoryNo: 'AQUI0000', categoryName: '濾材類' }]);
    http.expectOne(r => r.url.endsWith('/products')).flush([{ id: 8, productNo: 'internal', categoryId: 2, productName: '測試商品', categoryName: '濾材類', description: '說明', status: 'DRAFT', proNo: 'AQUI', image: null, minimumPrice: null, maximumPrice: null, stock: 0, videoUrl: null, variationName: null, variationMode: 'SINGLE' }]);
    http.expectOne(r => r.url.endsWith('/settings/taxes')).flush([]); http.expectOne(r => r.url.endsWith('/settings/shipping')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0)); fixture.detectChanges();
    (fixture.nativeElement.querySelector('.listing-row button') as HTMLButtonElement).click();
    http.expectOne(r => r.url.endsWith('/products/8/skus')).flush([]); http.expectOne(r => r.url.endsWith('/products/8/images')).flush([]);
    await new Promise(resolve => setTimeout(resolve, 0)); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.componentInstance.mainCategory).toBe('AQUI'); expect(fixture.componentInstance.form.categoryId).toBe(2);
    expect((fixture.nativeElement.querySelector('select[name="categoryId"]') as HTMLSelectElement).selectedOptions[0].textContent?.trim()).toBe('濾材類');
    http.verify();
  });
});
