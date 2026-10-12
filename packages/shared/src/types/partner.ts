export type PartnerStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
export interface PartnerProfile {
  id: string; userId: string; referralCode: string; specialties: string[]; city: string; region: string;
  services: string; experienceYears: number; status: PartnerStatus; reviewReason: string | null;
  reviewedAt: string | null; acceptedTermsVersion: string; version: number; createdAt: string; updatedAt: string;
  user?: { id: string; name: string; whatsapp: string | null; isActive: boolean };
}
export interface PartnerList { partners: PartnerProfile[]; page: number; limit: number; total: number; totalPages: number }
