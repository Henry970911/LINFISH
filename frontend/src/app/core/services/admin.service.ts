import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminAccessResponse {
  authorized: boolean;
  memberId: string;
  memberNo: string;
  modules: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  verifyAccess(): Promise<AdminAccessResponse> {
    return firstValueFrom(
      this.http.get<AdminAccessResponse>(`${environment.apiBaseUrl}/admin/access`),
    );
  }
}
