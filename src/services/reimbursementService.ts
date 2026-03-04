import { supabase } from './supabaseClient';
import { ReimbursementRequest, ReimbursementRequestWithMember } from './types';

export class ReimbursementService {

  /**
   * Create a new reimbursement request (member use)
   */
  static async createRequest(data: {
    chapter_id: string;
    member_id: string;
    purchase_name: string;
    reason: string;
    amount: number;
    purchase_date: string;
    zelle_contact: string;
    zelle_contact_type: 'phone' | 'email';
  }): Promise<ReimbursementRequest> {
    try {
      const { data: request, error } = await supabase
        .from('reimbursement_requests')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return request;
    } catch (error) {
      console.error('Error creating reimbursement request:', error);
      throw error;
    }
  }

  /**
   * Fetch current user's reimbursement requests
   */
  static async getMyRequests(): Promise<ReimbursementRequest[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reimbursement_requests')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching my reimbursement requests:', error);
      return [];
    }
  }

  /**
   * Fetch all reimbursement requests for a chapter (admin use)
   * Joins with user_profiles for member name/email
   */
  static async getChapterRequests(chapterId: string): Promise<ReimbursementRequestWithMember[]> {
    try {
      const { data, error } = await supabase
        .from('reimbursement_requests')
        .select(`
          *,
          user_profiles!reimbursement_requests_member_id_fkey (
            full_name,
            email
          )
        `)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        member_name: row.user_profiles?.full_name || 'Unknown',
        member_email: row.user_profiles?.email || '',
        user_profiles: undefined,
      }));
    } catch (error) {
      console.error('Error fetching chapter reimbursement requests:', error);
      return [];
    }
  }

  /**
   * Update a reimbursement request status (admin use)
   * Sets reviewed_by and reviewed_at automatically
   */
  static async updateRequestStatus(
    id: string,
    status: 'approved' | 'denied',
    adminNotes?: string
  ): Promise<ReimbursementRequest> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reimbursement_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating reimbursement request status:', error);
      throw error;
    }
  }

  /**
   * Delete a reimbursement request (admin/treasurer use)
   */
  static async deleteRequest(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reimbursement_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting reimbursement request:', error);
      throw error;
    }
  }
}
