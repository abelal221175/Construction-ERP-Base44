import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDate, formatCurrency } from '@/components/shared/formatters';
import { CheckCircle, XCircle, RotateCcw, Forward, FileText, Clock } from 'lucide-react';

const DOCUMENT_TYPES = {
  purchase_requisition: { ar: 'طلب شراء', en: 'Purchase Requisition', color: 'bg-blue-100 text-blue-700' },
  purchase_order: { ar: 'أمر شراء', en: 'Purchase Order', color: 'bg-indigo-100 text-indigo-700' },
  payment_voucher: { ar: 'سند صرف', en: 'Payment Voucher', color: 'bg-red-100 text-red-700' },
  receipt_voucher: { ar: 'سند قبض', en: 'Receipt Voucher', color: 'bg-green-100 text-green-700' },
  journal_entry: { ar: 'قيد يومية', en: 'Journal Entry', color: 'bg-purple-100 text-purple-700' },
  client_ipc: { ar: 'مستخلص عميل', en: 'Client IPC', color: 'bg-amber-100 text-amber-700' },
  subcontractor_ipc: { ar: 'مستخلص مقاول', en: 'Subcontractor IPC', color: 'bg-orange-100 text-orange-700' },
  variation_order: { ar: 'أمر تغيير', en: 'Variation Order', color: 'bg-cyan-100 text-cyan-700' },
};

export default function PendingApprovals() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [comments, setComments] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: approvalRequests = [], isLoading } = useQuery({
    queryKey: ['approvalRequests', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.ApprovalRequest.filter({ company_id: currentCompany.id, status: 'pending' }) : [],
  });

  // Filter requests where current user is the approver
  const myPendingRequests = approvalRequests.filter(r => r.current_approver_id === currentUser?.id);
  const allPendingRequests = approvalRequests;

  const displayedRequests = activeTab === 'my' ? myPendingRequests : allPendingRequests;

  const actionMutation = useMutation({
    mutationFn: async ({ requestId, action, comments }) => {
      const request = approvalRequests.find(r => r.id === requestId);
      
      // Create action record
      await base44.entities.ApprovalAction.create({
        approval_request_id: requestId,
        level_number: request.current_level,
        action: action,
        action_by: currentUser?.id,
        action_at: new Date().toISOString(),
        comments: comments
      });

      // Update request status
      let newStatus = 'pending';
      let newLevel = request.current_level;
      
      if (action === 'approve') {
        if (request.current_level >= request.total_levels) {
          newStatus = 'approved';
        } else {
          newLevel = request.current_level + 1;
        }
      } else if (action === 'reject') {
        newStatus = 'rejected';
      } else if (action === 'return') {
        newStatus = 'returned';
      }

      await base44.entities.ApprovalRequest.update(requestId, {
        status: newStatus,
        current_level: newLevel,
        completed_at: newStatus !== 'pending' ? new Date().toISOString() : null,
        notes: comments
      });

      return { action, newStatus };
    },
    onSuccess: ({ action }) => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
      setActionModalOpen(false);
      setSelectedRequest(null);
      setComments('');
      
      const messages = {
        approve: language === 'ar' ? 'تم الاعتماد بنجاح' : 'Approved successfully',
        reject: language === 'ar' ? 'تم الرفض' : 'Rejected',
        return: language === 'ar' ? 'تم الإرجاع للمراجعة' : 'Returned for revision'
      };
      toast.success(messages[action]);
    }
  });

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setComments('');
    setActionModalOpen(true);
  };

  const confirmAction = () => {
    actionMutation.mutate({
      requestId: selectedRequest.id,
      action: actionType,
      comments: comments
    });
  };

  const groupedRequests = displayedRequests.reduce((acc, req) => {
    if (!acc[req.document_type]) acc[req.document_type] = [];
    acc[req.document_type].push(req);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'الموافقات المعلقة' : 'Pending Approvals'}
        subtitle={language === 'ar' ? `${myPendingRequests.length} طلب في انتظار موافقتك` : `${myPendingRequests.length} requests awaiting your approval`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my" className="gap-2">
            <Clock className="h-4 w-4" />
            {language === 'ar' ? 'طلباتي' : 'My Approvals'} ({myPendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            {language === 'ar' ? 'الكل' : 'All Pending'} ({allPendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {Object.keys(groupedRequests).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                {language === 'ar' ? 'لا توجد موافقات معلقة' : 'No pending approvals'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRequests).map(([docType, requests]) => {
                const typeInfo = DOCUMENT_TYPES[docType];
                return (
                  <Card key={docType}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={typeInfo?.color}>{language === 'ar' ? typeInfo?.ar : typeInfo?.en}</Badge>
                        <span className="text-sm text-slate-500">({requests.length})</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {requests.map(request => (
                          <div key={request.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{request.document_number}</span>
                                <Badge variant="outline">
                                  {language === 'ar' ? 'المستوى' : 'Level'} {request.current_level}/{request.total_levels}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                {formatDate(request.requested_at)} • {formatCurrency(request.amount)}
                              </div>
                            </div>
                            
                            {request.current_approver_id === currentUser?.id && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleAction(request, 'approve')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {language === 'ar' ? 'اعتماد' : 'Approve'}
                                </Button>
                                <Button size="sm" variant="outline" className="text-amber-600 hover:bg-amber-50" onClick={() => handleAction(request, 'return')}>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  {language === 'ar' ? 'إرجاع' : 'Return'}
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleAction(request, 'reject')}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  {language === 'ar' ? 'رفض' : 'Reject'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Modal */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && (language === 'ar' ? 'تأكيد الاعتماد' : 'Confirm Approval')}
              {actionType === 'reject' && (language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection')}
              {actionType === 'return' && (language === 'ar' ? 'الإرجاع للمراجعة' : 'Return for Revision')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <div className="font-medium">{selectedRequest?.document_number}</div>
              <div className="text-sm text-slate-500">{formatCurrency(selectedRequest?.amount)}</div>
            </div>
            <Textarea
              placeholder={language === 'ar' ? 'أضف ملاحظات (اختياري)...' : 'Add comments (optional)...'}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModalOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionMutation.isPending}
              className={cn(
                actionType === 'approve' && 'bg-green-600 hover:bg-green-700',
                actionType === 'reject' && 'bg-red-600 hover:bg-red-700',
                actionType === 'return' && 'bg-amber-600 hover:bg-amber-700'
              )}
            >
              {actionMutation.isPending ? (language === 'ar' ? 'جاري...' : 'Processing...') : (
                <>
                  {actionType === 'approve' && (language === 'ar' ? 'اعتماد' : 'Approve')}
                  {actionType === 'reject' && (language === 'ar' ? 'رفض' : 'Reject')}
                  {actionType === 'return' && (language === 'ar' ? 'إرجاع' : 'Return')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}