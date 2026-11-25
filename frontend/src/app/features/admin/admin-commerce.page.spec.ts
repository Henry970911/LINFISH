import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminCommercePageComponent } from './admin-commerce.page';
import { vi } from 'vitest';

describe('商品分類操作', () => {
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
