import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MemberProfile {
  userNo: string;
  userName: string;
  userPhone: string | null;
  email: string;
  memberTier: string;
  status: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private readonly http = inject(HttpClient);

  async getMe(): Promise<MemberProfile> {
    return firstValueFrom(
      this.http.get<MemberProfile>(`${environment.apiBaseUrl}/members/me`),
    );
  }
}
